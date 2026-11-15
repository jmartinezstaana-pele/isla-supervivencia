// HUD provisional: título, controles, aguante, mensajes y panel de depuración (F3).

import { VIEW_W, VIEW_H, TILE, PLAYER, jumpDistanceTiles } from '../config.js';

const CONTROLES = 'WASD / flechas moverse · Mayús correr · Espacio saltar · C agacharse · ' +
  'empuja contra una pared para escalar · Esc pausa · F3 depuración';

const TERRENO = { land: 'tierra', shallow: 'agua poco profunda', deep: 'agua profunda', tallgrass: 'hierba alta' };
const MIRA = { up: 'arriba', down: 'abajo', left: 'izquierda', right: 'derecha' };

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 20, 25, 0.6)';
  ctx.fillRect(x, y, w, h);
}

export function drawHud(ctx, game) {
  const p = game.player;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  panel(ctx, 12, 12, 360, 30);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#fff3d6';
  ctx.fillText('Isla · mundo de prueba cenital (Fase 1b)', 24, 28);

  // Aguante: solo se muestra si no está lleno.
  if (p.stamina < PLAYER.staminaMax - 0.01 || p.state === 'climb') {
    const w = 220;
    panel(ctx, VIEW_W - w - 32, 12, w + 20, 30);
    ctx.fillStyle = '#e8f0f0';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Aguante', VIEW_W - w - 22, 28);
    const bx = VIEW_W - w + 40;
    const bw = w - 70;
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, 21, bw, 14);
    const k = p.stamina / PLAYER.staminaMax;
    ctx.fillStyle = k > 0.3 ? '#e2c044' : '#e0553c';
    ctx.fillRect(bx, 21, bw * k, 14);
  }

  if (p.message) {
    ctx.font = 'bold 20px system-ui, sans-serif';
    const w = ctx.measureText(p.message.text).width + 32;
    panel(ctx, (VIEW_W - w) / 2, 70, w, 36);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(p.message.text, VIEW_W / 2, 88);
    ctx.textAlign = 'left';
  }

  ctx.font = '14px system-ui, sans-serif';
  const w = ctx.measureText(CONTROLES).width + 24;
  panel(ctx, (VIEW_W - w) / 2, VIEW_H - 40, w, 28);
  ctx.fillStyle = '#e8f0f0';
  ctx.textAlign = 'center';
  ctx.fillText(CONTROLES, VIEW_W / 2, VIEW_H - 26);
  ctx.textAlign = 'left';

  if (game.debug) drawDebug(ctx, game);
  if (game.paused) drawPause(ctx);
}

function drawDebug(ctx, game) {
  const p = game.player;
  const lines = [
    `FPS: ${game.fps.toFixed(0)}`,
    `Pies (tiles): ${(p.x / TILE).toFixed(2)}, ${(p.y / TILE).toFixed(2)} · nivel ${p.level}`,
    `Velocidad: ${p.vx.toFixed(0)}, ${p.vy.toFixed(0)} px/s`,
    `Estado: ${p.stateName} · terreno: ${TERRENO[p.terrain]}`,
    `Animación: ${p.anim.name} [${p.anim.index}] · mira ${MIRA[p.facing]}`,
    `Aguante: ${p.stamina.toFixed(0)} · Agilidad ${p.agility} → salto ${jumpDistanceTiles(p.agility).toFixed(2)} tiles`,
  ];
  panel(ctx, 12, 52, 420, lines.length * 20 + 12);
  ctx.font = '13px ui-monospace, monospace';
  ctx.fillStyle = '#c8ffd0';
  lines.forEach((l, i) => ctx.fillText(l, 22, 68 + i * 20));
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText('PAUSA', VIEW_W / 2, VIEW_H / 2 - 20);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Pulsa Esc para continuar', VIEW_W / 2, VIEW_H / 2 + 28);
  ctx.textAlign = 'left';
}
