"""Extrae fotogramas de las hojas de sprites del usuario y genera assets/atlas.png + atlas.json.
Dependencias: Python 3, numpy, Pillow, scipy."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd

# Uso: python3 extract_sprites.py <carpeta_imagenes_origen> <carpeta_salida>
SRC = (sys.argv[1] if len(sys.argv) > 1 else 'Imagenes').rstrip('/\\') + '/'
OUT = (sys.argv[2] if len(sys.argv) > 2 else 'assets').rstrip('/\\') + '/'

def load(f):
    return np.array(Image.open(SRC + f).convert('RGBA')).astype(np.int32)

def mask_dark_bg(reg, bgthr=26, light=False):
    rgb = reg[..., :3]
    if light:
        bg = np.median(rgb[:3].reshape(-1, 3), axis=0)
    else:
        # estimate bg from border
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
        bg = np.median(border, axis=0)
    d = np.abs(rgb - bg).sum(-1)
    m = d > bgthr
    return m

def components(m, minarea):
    lab, n = nd.label(m, structure=np.ones((3, 3)))
    objs = nd.find_objects(lab)
    out = []
    for i, sl in enumerate(objs):
        area = (lab[sl] == i + 1).sum()
        if area >= minarea:
            out.append((sl, i + 1, area))
    return lab, out

def extract_row(f, box, n_expected, bgthr=26, minarea=150, light=False, merge_gap=6):
    im = load(f)
    x0, y0, x1, y1 = box
    reg = im[y0:y1, x0:x1].copy()
    m = mask_dark_bg(reg, bgthr, light)
    m = nd.binary_opening(m, iterations=1)
    lab, comps = components(m, minarea)
    # merge components into frames by x overlap
    spans = sorted([[sl[1].start, sl[1].stop, sl[0].start, sl[0].stop, idx] for sl, idx, a in comps])
    frames = []
    for s in spans:
        if frames and s[0] <= frames[-1][1] + merge_gap:
            fr = frames[-1]
            fr[1] = max(fr[1], s[1]); fr[2] = min(fr[2], s[2]); fr[3] = max(fr[3], s[3]); fr[4].append(s[4])
        else:
            frames.append([s[0], s[1], s[2], s[3], [s[4]]])
    res = []
    for fx0, fx1, fy0, fy1, ids in frames:
        sub = np.isin(lab[fy0:fy1, fx0:fx1], ids)
        sub = nd.binary_fill_holes(sub)
        sub = nd.binary_dilation(sub, iterations=1) & (mask_dark_bg(reg, 8, light)[fy0:fy1, fx0:fx1] | sub)
        rgba = reg[fy0:fy1, fx0:fx1].copy()
        rgba[..., 3] = np.where(sub, 255, 0)
        res.append(rgba.astype(np.uint8))
    print(f, 'frames found', len(res), [r.shape[:2] for r in res], file=sys.stderr)
    return res

sheets = {}
# lateral right rows
# 4 direcciones (vista cenital). 'walk'/'run' = derecha (se mantienen por compatibilidad).
sheets['walk'] = extract_row('Andar.png', (200, 755, 1040, 925), 6)
sheets['walk_down'] = extract_row('Andar.png', (200, 95, 1040, 292), 6)
sheets['walk_up'] = extract_row('Andar.png', (200, 330, 1040, 514), 6)
sheets['walk_left'] = extract_row('Andar.png', (200, 550, 1040, 727), 6)
sheets['run'] = extract_row('Correr.png', (170, 700, 1220, 840), 8)
sheets['run_down'] = extract_row('Correr.png', (170, 100, 1220, 280), 8)
sheets['run_up'] = extract_row('Correr.png', (170, 318, 1220, 484), 8)
sheets['run_left'] = extract_row('Correr.png', (170, 512, 1220, 668), 8)
sheets['jump'] = extract_row('Saltar.png', (0, 28, 870, 148), 6, minarea=80)
sheets['crouch'] = extract_row('Agacharse.png', (0, 26, 258, 70), 4, minarea=40, merge_gap=3)
sheets['roll'] = extract_row('Rodar.png', (0, 24, 426, 72), 7, minarea=40, merge_gap=3)
sheets['dodge'] = extract_row('Deslizarse.png', (0, 22, 441, 80), 6, minarea=40, merge_gap=3)
sheets['turn'] = extract_row('Girar.png', (0, 22, 374, 86), 6, minarea=40, merge_gap=3)
sheets['hurt'] = extract_row('Recibir golpe.png', (0, 30, 128, 160), 1, minarea=80)
sheets['pick'] = extract_row('Coger objeto (suelo).png', (0, 5, 133, 140), 1, minarea=80)
sheets['reach'] = extract_row('Coger objeto (media altura).png', (40, 0, 189, 145), 1, minarea=80, merge_gap=0)
sheets['up'] = extract_row('Coger objeto (alto).png', (55, 0, 143, 175), 1, minarea=80, merge_gap=0)
sheets['idle'] = extract_row('1. Quieto.png', (0, 0, 70, 163), 1, light=True, bgthr=40, minarea=200)

import pickle
# debug montage
for k, frs in sheets.items():
    h = max(f.shape[0] for f in frs); w = sum(f.shape[1] + 4 for f in frs)
    mont = Image.new('RGBA', (w, h), (255, 0, 255, 255))
    x = 0
    for f in frs:
        mont.alpha_composite(Image.fromarray(f), (x, h - f.shape[0])); x += f.shape[1] + 4
    mont.save(OUT + 'dbg_' + k + '.png')

# --- fixes ---
sheets['crouch'] = [f for f in sheets['crouch'] if f.shape[1] > 10]
def largest_only(f, box):
    fr = extract_row(f, box, 1, minarea=80, merge_gap=0)
    return [max(fr, key=lambda a: (a[..., 3] > 0).sum())]
sheets['reach'] = largest_only('Coger objeto (media altura).png', (0, 0, 104, 150))
sheets['up'] = largest_only('Coger objeto (alto).png', (60, 0, 143, 178))
del sheets['turn']
scales = {'walk': .6, 'walk_down': .54, 'walk_up': .6, 'walk_left': .6, 'run': .64, 'run_down': .59, 'run_up': .64, 'run_left': .64, 'jump': .74, 'crouch': 1.5, 'roll': 1.5, 'dodge': 1.5,
          'hurt': .8, 'pick': .72, 'reach': .66, 'up': .66, 'idle': .6}
frames_meta = {}
packed = []
for k, frs in sheets.items():
    for i, f in enumerate(frs):
        f = f.copy()
        blk = (f[..., :3].astype(int).sum(-1) < 40) & (f[..., 3] > 0)
        thick = nd.binary_dilation(nd.binary_opening(blk, iterations=3), iterations=4) & blk
        f[thick, 3] = 0
        # keep largest component only
        lab, n = nd.label(f[..., 3] > 0, structure=np.ones((3, 3)))
        if n > 1:
            sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
            keep = [i + 1 for i, sz in enumerate(sizes) if sz >= sizes.max() * 0.08]
            f[~np.isin(lab, keep), 3] = 0
        ys, xs = np.nonzero(f[..., 3])
        f = f[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        im = Image.fromarray(f)
        s = scales[k]
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        a = np.array(im); a[..., 3] = np.where(a[..., 3] > 110, 255, 0); im = Image.fromarray(a)
        packed.append((k, i, im))
# simple shelf packing
W = 1024; x = y = sh = 0
pos = []
for k, i, im in packed:
    if x + im.width + 2 > W:
        x = 0; y += sh + 2; sh = 0
    pos.append((k, i, im, x, y)); x += im.width + 2; sh = max(sh, im.height)
H = y + sh
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
meta = {}
for k, i, im, px, py in pos:
    atlas.alpha_composite(im, (px, py))
    meta.setdefault(k, []).append([px, py, im.width, im.height])
atlas.save(OUT + 'atlas.png', optimize=True)
json.dump(meta, open(OUT + 'atlas.json', 'w'))
print('atlas', atlas.size, {k: len(v) for k, v in meta.items()}, file=sys.stderr)
for f, n, w in [('Avion.png', 'avion.jpg', 1280), ('3. Paisaje.jpg', 'paisaje.jpg', 1280)]:
    im = Image.open(SRC + f).convert('RGB'); im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(OUT + n, quality=76, optimize=True, progressive=True)
