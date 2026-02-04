(function(){
  function makeSerial(len=6){
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i=0;i<len;i++) s += chars[Math.floor(Math.random()*chars.length)];
    return s;
  }

  function getOrCreateId(storageKey, prefix){
    let v = localStorage.getItem(storageKey);
    if (!v){
      v = `${prefix}${makeSerial(6)}`;
      localStorage.setItem(storageKey, v);
    }
    return v;
  }

  function roundRectPath(ctx, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function fillRoundRect(ctx, x,y,w,h,r, fillStyle){
    ctx.save();
    ctx.fillStyle = fillStyle;
    roundRectPath(ctx,x,y,w,h,r);
    ctx.fill();
    ctx.restore();
  }

  function strokeRoundRect(ctx, x,y,w,h,r, strokeStyle, lineWidth=2){
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    roundRectPath(ctx,x,y,w,h,r);
    ctx.stroke();
    ctx.restore();
  }

  function loadImage(src){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function loadVideoFrame(webmSrc){
    return new Promise((resolve, reject) => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = webmSrc;

      const cleanup = () => {
        v.onloadeddata = null;
        v.onseeked = null;
        v.onerror = null;
      };

      v.onerror = () => { cleanup(); reject(new Error("logo webm load failed")); };

      v.onloadeddata = () => {
        try { v.currentTime = 0; } catch {}
        const done = () => { cleanup(); resolve(v); };
        v.onseeked = done;
        setTimeout(done, 120);
      };
    });
  }

  function drawWaves(ctx, x, y, w, h){
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;

    const rows = 10;
    const amp = 6;
    const step = 14;

    for (let r=0; r<rows; r++){
      const yy = y + (h/(rows-1))*r;
      ctx.beginPath();
      for (let xx=0; xx<=w; xx+=step){
        const t = (xx / w) * Math.PI * 2;
        const y2 = yy + Math.sin(t + r*0.55) * amp;
        if (xx===0) ctx.moveTo(x+xx, y2);
        else ctx.lineTo(x+xx, y2);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  async function drawAvatarRounded(ctx, dataUrl, x, y, size, radius){
    fillRoundRect(ctx, x, y, size, size, radius, "rgba(0,0,0,0.25)");
    strokeRoundRect(ctx, x, y, size, size, radius, "rgba(255,255,255,0.20)", 3);

    ctx.save();
    roundRectPath(ctx, x, y, size, size, radius);
    ctx.clip();

    if (dataUrl && dataUrl.startsWith("data:")){
      try{
        const img = await loadImage(dataUrl);
        ctx.drawImage(img, x, y, size, size);
      } catch {}
    }

    const g = ctx.createLinearGradient(x, y, x+size, y+size);
    g.addColorStop(0, "rgba(255,255,255,0.10)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, size, size);

    ctx.restore();
  }

  async function draw(canvas, d){
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0,0,W,H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // card rect
    const pad = 56;
    const cardX = pad, cardY = pad;
    const cardW = W - pad*2;
    const cardH = H - pad*2;
    const R = 92;

    // main card background (outside is transparent)
    const bg = ctx.createLinearGradient(cardX, cardY, cardX+cardW, cardY+cardH);
    bg.addColorStop(0, "rgba(210,210,210,0.94)");
    bg.addColorStop(1, "rgba(170,170,170,0.94)");
    fillRoundRect(ctx, cardX, cardY, cardW, cardH, R, bg);

    strokeRoundRect(ctx, cardX+6, cardY+6, cardW-12, cardH-12, R-6, "rgba(255,255,255,0.22)", 2);
    strokeRoundRect(ctx, cardX+12, cardY+12, cardW-24, cardH-24, R-12, "rgba(0,0,0,0.10)", 2);

    // LOGO on card (це ЛОГО НА КАРТІ)
    const logoH = 78;               // <-- збільш/зменш тут
    const logoW = Math.round(logoH * 3.2);
    const logoX = cardX + 46;
    const logoY = cardY + 34;

    try{
      const v = await loadVideoFrame(d.logoWebmSrc);
      ctx.globalAlpha = 0.95;
      ctx.drawImage(v, logoX, logoY, logoW, logoH);
      ctx.globalAlpha = 1;
    } catch {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "900 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText("MagicBlock Quiz", logoX, logoY + 48);
    }

    // title
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "center";
    ctx.font = "900 56px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.quizTitle, cardX + cardW/2, cardY + 105);
    ctx.textAlign = "left";

    // layout
    const avatarSize = 200;
    const avX = cardX + 110;
    const avY = cardY + 190;
    await drawAvatarRounded(ctx, d.avatar || "", avX, avY, avatarSize, 54);

    const left = avX + avatarSize + 100;
    let y = avY + 70;

    // name
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Your Name:", left, y);

    y += 68;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 58px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.name || "Player", left, y);

    // separator
    y += 34;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(cardX + cardW - 120, y);
    ctx.stroke();

    // score
    y += 64;
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Score", left, y);

    y += 74;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 66px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`${d.correct} / ${d.total}`, left, y);

    // waves right (не заїжджає на текст)
    drawWaves(ctx, cardX + cardW - 520, cardY + 200, 420, 240);

    // ID block (тепер нижче і НЕ налазить)
    y += 74;
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("ID Name:", left, y);

    const pillX = left;
    const pillY = y + 22;
    const pillW = Math.min(740, cardX + cardW - pillX - 80);
    const pillH = 60;

    fillRoundRect(ctx, pillX, pillY, pillW, pillH, 28, "rgba(0,0,0,0.30)");
    strokeRoundRect(ctx, pillX, pillY, pillW, pillH, 28, "rgba(255,255,255,0.14)", 2);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.idText || "MB-—", pillX + 22, pillY + 40);

    // accuracy bottom-left
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.font = "800 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`Accuracy: ${d.acc}%`, cardX + 70, cardY + cardH - 44);
  }

  window.MBResultCard = { draw, getOrCreateId };
})();
