const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
let teams = [];
let gameState = {displayMode:"intro",currentSlideIndex:0,finalRevealCount:0,podiumRevealCount:0};
app.use(express.json({limit:"40kb"}));
app.post("/api/results/save", async (req,res) => {
  const key = process.env.BGOS_SAVE_KEY;
  const url = process.env.BGOS_RESULTS_URL;
  if (!key || !url) return res.status(503).json({ok:false,error:"Results integration not configured on Render"});
  const supplied = String(req.body?.password || "");
  if (supplied.length !== key.length || !crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(key))) return res.status(403).json({ok:false,error:"Incorrect save password"});
  const {gameId,date,venue,standings} = req.body || {};
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(String(gameId || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !String(venue||"").trim() || !Array.isArray(standings) || !standings.length || standings.length>100 || standings.some((t,i)=>t.place!==i+1 || !String(t.name||"").trim() || !Number.isFinite(Number(t.score)))) return res.status(400).json({ok:false,error:"Invalid results"});
  try {
    const upstream = await fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({gameId,date,venue,standings,saveKey:key}),redirect:"follow",signal:AbortSignal.timeout(20000)});
    const body = await upstream.text();
    let result;
    try {result=JSON.parse(body);} catch {throw new Error("Google Apps Script did not return JSON. Check deployment access and URL.");}
    if (!upstream.ok || !result.ok) throw new Error(result.error || "Google Sheets rejected results");
    res.json({ok:true,duplicate:!!result.duplicate,saved:result.saved||standings.length});
  } catch(err) {res.status(502).json({ok:false,error:err.message});}
});
app.use(express.static("public"));
io.on("connection", socket => {
  socket.emit("updateTeams",teams);
  socket.emit("gameState",gameState);
  socket.on("updateTeams",updatedTeams=>{teams=updatedTeams||[];io.emit("updateTeams",teams);});
  socket.on("gameState",updatedState=>{gameState={...gameState,...updatedState};io.emit("gameState",gameState);});
  socket.on("resetGameState",()=>{gameState={displayMode:"intro",currentSlideIndex:0,finalRevealCount:0,podiumRevealCount:0};io.emit("gameState",gameState);});
});
server.listen(PORT,()=>console.log(`Server running on port ${PORT}`));