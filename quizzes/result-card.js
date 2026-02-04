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
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;

    const rows = 12;
    const amp = 7;
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

    // main rounded card (outside stays transparent)
    const pad = Math.round(W * 0.04);
    const R = Math.round(H * 0.09);

    const bg = ctx.createLinearGradient(pad, pad, W-pad, H-pad);
    bg.addColorStop(0, "rgba(210,210,210,0.92)");
    bg.addColorStop(1, "rgba(165,165,165,0.92)");
    fillRoundRect(ctx, pad, pad, W-pad*2, H-pad*2, R, bg);

    strokeRoundRect(ctx, pad+6, pad+6, W-(pad+6)*2, H-(pad+6)*2, R-6, "rgba(255,255,255,0.20)", 2);
    strokeRoundRect(ctx, pad+10, pad+10, W-(pad+10)*2, H-(pad+10)*2, R-10, "rgba(0,0,0,0.10)", 2);

    // LOGO on card (BIGGER)
    const logoX = pad + 42;
    const logoY = pad + 32;
    const logoH = 78;              // <-- ОЦЕ РОЗМІР ЛОГО НА КАРТІ
    const logoW = Math.round(logoH * 3.2);

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

    // title center
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "center";
    ctx.font = "900 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.quizTitle, W/2, pad + 95);
    ctx.textAlign = "left";

    // avatar
    const avSize = 220;
    const avX = pad + 110;
    const avY = pad + 190;
    await drawAvatarRounded(ctx, d.avatar || "", avX, avY, avSize, 54);

    // text block
    const left = avX + avSize + 120;
    const line1 = avY + 80;

    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Your Name:", left, line1);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 58px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.name || "Player", left, line1 + 70);

    // separator
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, line1 + 100);
    ctx.lineTo(W - pad - 120, line1 + 100);
    ctx.stroke();

    // score
    const scoreY = line1 + 170;
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Score", left, scoreY);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`${d.correct} / ${d.total}`, left, scoreY + 78);

    // waves right
    drawWaves(ctx, W - pad - 520, pad + 180, 420, 260);

    // ID
    const idLabelY = H - pad - 150;
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("ID Name:", left, idLabelY);

    const pillX = left;
    const pillY = idLabelY + 26;
    const pillW = Math.min(760, W - pillX - pad - 90);
    const pillH = 64;

    fillRoundRect(ctx, pillX, pillY, pillW, pillH, 28, "rgba(0,0,0,0.30)");
    strokeRoundRect(ctx, pillX, pillY, pillW, pillH, 28, "rgba(255,255,255,0.14)", 2);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.idText || "MB-—", pillX + 24, pillY + 42);

    // accuracy bottom-left
    ctx.fillStyle = "rgba(0,0,0,0.26)";
    ctx.font = "800 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`Accuracy: ${d.acc}%`, pad + 68, H - pad - 48);
  }

  window.MBResultCard = { draw, getOrCreateId };
})();
