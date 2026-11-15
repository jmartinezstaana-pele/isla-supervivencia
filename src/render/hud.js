// HUD provisional: título, controles y panel de depuración (F3).

import { VIEW_W, VIEW_H, TILE, jumpHeightTiles } from '../config.js';

const CONTROLES = 'A/D o ←/→ moverse · Mayús correr · Espacio/W saltar · S agacharse · ' +
  'S + Espacio bajar de plataforma · Esc pausa · F3 depuración';

const SUELO = { solid: 'sólido', platform: 'plataforma' };

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 20, 25, 0.6)';
  ctx.fillRect(x, y, w, h);
}

export function drawHud(ctx, game) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textBaseline = 'middle';

  panel(ctx, 12, 12, 330, 30);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#fff3d6';
  ctx.fillText('Isla · mundo de prueba (Fase 1)', 24, 28);

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
    `Posición (tiles): ${(p.centerX / TILE).toFixed(1)}, ${(p.feetY / TILE).toFixed(1)}`,
    `Velocidad: ${p.vx.toFixed(0)}, ${p.vy.toFixed(0)} px/s`,
    `Estado: ${p.stateName}${p.running ? ' (Mayús)' : ''}`,
    `Suelo: ${SUELO[p.groundType] || 'no'} · Agua: ${p.swimming ? 'sí' : 'no'}`,
    `Animación: ${p.anim.name} [${p.anim.index}] · mira ${p.facing > 0 ? 'derecha' : 'izquierda'}`,
    `Agilidad: ${p.agility} → salto ${jumpHeightTiles(p.agility).toFixed(2)} tiles`,
  ];
  panel(ctx, 12, 52, 360, lines.length * 20 + 12);
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
