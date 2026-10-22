"""Synthesizes the soundtrack (background music + cue-synced SFX) for the animation.
usage: python3 audio.py cues.json out.wav
Everything is generated procedurally with numpy: no samples, no voice.
"""
import json, sys
import numpy as np

SR = 48000
DUR = 89.0
N = int(SR * DUR)
rng = np.random.default_rng(7)


def t_axis(d):
    return np.arange(int(SR * d)) / SR


def env_ad(n, a, d_curve):
    """attack (s) then exponential decay with time-constant d_curve (s)"""
    t = np.arange(n) / SR
    e = np.exp(-t / d_curve)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def band(sig, lo, hi):
    """FFT band-pass with soft edges"""
    n = len(sig)
    f = np.fft.rfftfreq(n, 1 / SR)
    S = np.fft.rfft(sig)
    m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(S * m, n)


def noise(d):
    return rng.standard_normal(int(SR * d))


def sweep(f0, f1, d, wave='sine', curve='exp'):
    t = t_axis(d)
    if curve == 'exp':
        f = f0 * (f1 / f0) ** (t / d)
    else:
        f = f0 + (f1 - f0) * t / d
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave == 'square':
        return np.sign(np.sin(ph)) * .6
    if wave == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph)


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------- instruments
def bell(f, d=1.6, bright=1.0):
    t = t_axis(d)
    parts = [(1, 1, 1.0), (2.76, .5 * bright, .45), (5.4, .25 * bright, .22), (8.93, .12 * bright, .12)]
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (d * dd)) for r, a, dd in parts)
    s *= env_ad(len(t), .002, 10)
    return s * .5


def marimba(f, d=.9):
    t = t_axis(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / .32) + .35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / .05) + .12 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t / .015)
    return s * env_ad(len(t), .003, 10) * .55


def kalimba(f, d=1.2):
    t = t_axis(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / .45) + .3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / .04) + .15 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / .2)
    return s * env_ad(len(t), .002, 10) * .5


def pluck_bass(f, d=.6):
    t = t_axis(d)
    s = np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t) * np.exp(-t / .1) + .12 * np.sin(6 * np.pi * f * t) * np.exp(-t / .05)
    return s * env_ad(len(t), .006, .35) * .6


def pad(notes, d, att=.8, rel=.9):
    t = t_axis(d + rel)
    s = np.zeros_like(t)
    for m in notes:
        f = midi(m)
        for det in (-.07, .07):
            ff = f * 2 ** (det / 12)
            for h, a in ((1, 1), (2, .35), (3, .16), (4, .07)):
                s += a * np.sin(2 * np.pi * ff * h * t + rng.random() * 6.28)
    e = np.ones_like(t)
    na = int(att * SR); e[:na] = np.linspace(0, 1, na) ** 1.5
    nd = int(d * SR); e[nd:] = np.exp(-(t[nd:] - d) / (rel / 3))
    trem = 1 + .06 * np.sin(2 * np.pi * .3 * t)
    return s * e * trem * .045 / max(1, len(notes) ** .5)


def kick(soft=1.0):
    d = .32; t = t_axis(d)
    s = sweep(110, 45, d) * np.exp(-t / .12)
    return s * .7 * soft


def shaker(acc=1.0):
    s = band(noise(.07), 5000, 12000) * env_ad(int(.07 * SR), .004, .02)
    return s * .07 * acc


def brush():
    s = band(noise(.18), 1500, 8000) * env_ad(int(.18 * SR), .005, .06)
    return s * .09


def woodblock(f=1500):
    d = .08; t = t_axis(d)
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.3 * t)) * np.exp(-t / .018) * .22


# ---------------------------------------------------------------- mixing helpers
L = np.zeros(N); R = np.zeros(N)
ML = np.zeros(N); MR = np.zeros(N)


def add(buf_l, buf_r, s, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i + len(s) <= 0:
        return
    if i < 0:
        s = s[-i:]; i = 0
    s = s[: N - i]
    gl = gain * np.cos((pan + 1) * np.pi / 4) * 1.414
    gr = gain * np.sin((pan + 1) * np.pi / 4) * 1.414
    buf_l[i:i + len(s)] += s * gl
    buf_r[i:i + len(s)] += s * gr


def mus(s, t0, gain=1.0, pan=0.0):
    add(ML, MR, s, t0, gain, pan)


def sfx(s, t0, gain=1.0, pan=0.0):
    add(L, R, s, t0, gain, pan)


# ---------------------------------------------------------------- music
BEAT = 60 / 96
BAR = BEAT * 4
CH = {
    'Cmaj7': (36, [60, 64, 67, 71]), 'Am7': (45, [57, 60, 64, 67]), 'Fmaj7': (41, [53, 57, 60, 64]), 'G6': (43, [55, 59, 62, 64]),
    'C': (36, [55, 60, 64, 67]), 'G/B': (47, [55, 59, 62, 67]), 'Am': (45, [57, 60, 64, 69]), 'F': (41, [53, 57, 60, 65]),
    'Dm': (38, [53, 57, 62, 65]), 'Esus': (40, [52, 57, 59, 62]), 'E': (40, [52, 56, 59, 64]), 'Em': (40, [55, 59, 64, 67]), 'G': (43, [55, 59, 62, 67]),
}
PROG = (['Cmaj7', 'Am7', 'Fmaj7', 'G6'] +           # S1 hook        0-10
        ['C', 'G/B', 'Am', 'F'] +                   # S2 number line 10-20
        ['Am', 'F', 'Dm', 'Esus'] +                 # S3 problem     20-30
        ['C', 'F', 'Am', 'G', 'C', 'F', 'G'] +      # S4 mechanism   30-47.5
        ['F', 'G', 'Em', 'Am', 'F', 'G'] +          # S5 discovery   47.5-62.5
        ['F', 'G', 'Am', 'C', 'F', 'G'] +           # S6 consequence 62.5-77.5
        ['C', 'Am', 'F', 'G', 'C'])                 # S7 recap       77.5-
SECTION = [0] * 4 + [1] * 4 + [2] * 4 + [3] * 7 + [4] * 6 + [5] * 6 + [6] * 5


def build_music():
    mr = np.random.default_rng(11)
    for b, name in enumerate(PROG):
        t0 = b * BAR
        if t0 > 87.6:
            break
        sec = SECTION[b]
        root, notes = CH[name]
        last = b == len(PROG) - 1
        dur = BAR if not last else 3.0
        if name == 'Esus':  # resolve sus -> E in second half
            mus(pad(CH['Esus'][1], BAR / 2), t0, 1.0); mus(pad(CH['E'][1], BAR / 2), t0 + BAR / 2, 1.0)
        else:
            mus(pad(notes, dur, att=.5 if sec else 1.2, rel=1.6 if last else .9), t0, 1.0 if sec != 3 else .9)
        tones = sorted(set([n + 12 for n in notes] + [n + 24 for n in notes]))
        # bass
        if sec in (1, 3, 4, 5, 6) and not last:
            pat = [0, 2.5, 3] if sec in (3, 5) else [0, 2]
            for k in pat:
                mus(pluck_bass(midi(root + (12 if k == 3 else 0))), t0 + k * BEAT, .9)
        if last:
            mus(pluck_bass(midi(root), 2.4), t0, .9)
        # drums
        if sec in (3, 4, 5) or (sec == 6 and b < 34):
            for k in range(4):
                if k in (0, 2):
                    mus(kick(.8), t0 + k * BEAT, .8)
                if k in (1, 3):
                    mus(brush(), t0 + k * BEAT, .8, .15)
            for k in range(16):
                mus(shaker(1.0 if k % 2 == 0 else .55), t0 + k * BEAT / 4, .9, -.3)
        if sec == 1:
            for k in (0, 2):
                mus(kick(.55), t0 + k * BEAT, .7)
            for k in range(8):
                mus(shaker(.8 if k % 2 == 0 else .5), t0 + k * BEAT / 2, .7, -.3)
        if sec == 4:  # machine clock
            for k in range(8):
                mus(woodblock(1500 if k % 2 == 0 else 1150), t0 + k * BEAT / 2, .55, .35)
        # melodic layer
        if sec == 0:
            for k, step in enumerate([0, 3, 5]):
                n = tones[[2, 4, 3][k] % len(tones)]
                mus(kalimba(midi(n)), t0 + step * BEAT / 2 + BEAT * (k == 2), .55, .25)
        elif sec == 1:
            for k in range(8):
                if mr.random() < .62 or k == 0:
                    n = tones[mr.integers(1, len(tones))]
                    mus(kalimba(midi(n)), t0 + k * BEAT / 2, .5, .3 * (1 if k % 2 else -1))
        elif sec == 2:  # tense ostinato
            ost = [0, 2, 1, 2, 0, 2, 1, 3]
            low = sorted(notes)
            for k in range(8):
                mus(marimba(midi(low[ost[k] % len(low)])), t0 + k * BEAT / 2, .55, -.2)
        elif sec in (3, 4, 5):
            arp = [0, 1, 2, 3, 4, 3, 2, 1]
            for k in range(8):
                n = tones[arp[k] % len(tones)]
                mus(marimba(midi(n)), t0 + k * BEAT / 2, .42, .25 * np.sin(k))
            if sec == 5:  # glockenspiel lift
                for k in (0, 3, 6):
                    n = tones[min(len(tones) - 1, 4 + (k // 3))] + 12
                    mus(bell(midi(n), 1.2, .6), t0 + k * BEAT / 2, .2, .4)
        elif sec == 6:
            mel = [4, 5, 6, 5] if not last else [4]
            for k, idx in enumerate(mel):
                n = tones[idx % len(tones)]
                mus(kalimba(midi(n), 2.0 if last else 1.2), t0 + k * BEAT, .55, .2)
    # final shimmer
    mus(bell(midi(84), 3.0, .5), 85.0, .25, .3)


# ---------------------------------------------------------------- sfx
def S_blip(c):
    d = .06; return sweep(880, 880, d, 'square') * env_ad(int(d * SR), .002, .03) * .35


def S_boop(c):
    d = .16; return sweep(380, 950, d, 'square') * env_ad(int(d * SR), .003, .09) * .4


def S_type(c):
    v = c.get('v', 0)
    d = .03; s = band(noise(d), 1800 + v * 300, 6000) * env_ad(int(d * SR), .0005, .006)
    t = t_axis(d); s += .3 * np.sin(2 * np.pi * (180 + v * 20) * t) * np.exp(-t / .008)
    return s * .5


SCALE = [0, 2, 4, 5, 7, 9, 12]


def S_hop(c):
    p = c.get('p', -1)
    base = 520 if p < 0 else 440 * 2 ** (SCALE[p % 7] / 12)
    d = .14; return sweep(base * .7, base * 1.6, d, 'square') * env_ad(int(d * SR), .002, .07) * .28


def S_land(c):
    d = .12; t = t_axis(d)
    s = sweep(140, 60, d) * np.exp(-t / .04) * .6 + band(noise(d), 200, 2500) * np.exp(-t / .015) * .25
    return s


def S_thump(c):
    d = .2; t = t_axis(d)
    return sweep(150, 80, d) * np.exp(-t / .07) * .7 + band(noise(d), 300, 3000) * np.exp(-t / .02) * .25


def S_paper(c):
    d = c.get('d', .6); n = int(d * SR); t = t_axis(d)
    flutter = (np.abs(np.sin(2 * np.pi * (14 + 10 * t / d) * t + 3 * np.sin(2 * np.pi * 3.1 * t))) ** 3)
    s = band(noise(d), 800, 7000) * (.35 + flutter) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** .7
    return s * (.18 if c.get('soft') else .3)


def S_slap(c):
    d = .2; t = t_axis(d)
    return band(noise(d), 300, 5000) * np.exp(-t / .03) * .6 + sweep(110, 50, d) * np.exp(-t / .06) * .5


def S_fall(c):
    d = .45 if c.get('short') else .9; t = t_axis(d)
    return sweep(1500, 500, d) * np.sin(np.pi * t / d) ** .5 * .12


def S_twinkle(c):
    out = np.zeros(int(1.6 * SR))
    notes = [84, 88, 91, 96] if not c.get('soft') else [88, 91]
    for k, m in enumerate(notes):
        b = bell(midi(m), 1.0, .8); i = int(k * .07 * SR); out[i:i + len(b)] += b[: len(out) - i]
    return out * (.35 if c.get('soft') else .45)


def S_scribble(c):
    d = c.get('d', .5); t = t_axis(d)
    am = np.clip(np.sin(2 * np.pi * 9 * t + 2 * np.sin(2 * np.pi * 2.3 * t)), 0, 1) ** 1.5
    s = band(noise(d), 1500, 6500) * (.2 + am) * np.minimum(1, np.minimum(t / .03, (d - t) / .05 + .01))
    return s * .16


def S_pop(c):
    p = c.get('p', 1.0); d = .1; t = t_axis(d)
    return sweep(700 * p, 300 * p, d) * np.exp(-t / .035) * .45


def S_stretch(c):
    d = 1.3 if c.get('long') else .9; t = t_axis(d)
    f0, f1 = (180, 520) if not c.get('long') else (500, 220)
    f = f0 * (f1 / f0) ** (t / d) * (1 + .04 * np.sin(2 * np.pi * 9 * t))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return s * np.sin(np.pi * t / d) ** .6 * .18


def S_tick(c):
    p = c.get('p', 0); return woodblock(1700 + p * 70) * 1.4


def S_tickSoft(c):
    p = c.get('p', 0); return woodblock(2300 + p * 60) * .6


def S_pin(c):
    d = .25; t = t_axis(d)
    return (np.sin(2 * np.pi * 2600 * t) + .5 * np.sin(2 * np.pi * 3900 * t)) * np.exp(-t / .05) * .18 + band(noise(d), 2000, 9000) * np.exp(-t / .006) * .2


def S_boing(c):
    d = .55; t = t_axis(d)
    f = 260 * (1 + .25 * np.sin(2 * np.pi * 16 * t) * np.exp(-t / .3)) * (1 - .3 * t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .2) * .4


def S_shimmer(c):
    d = c.get('d', 1.0); t = t_axis(d); s = np.zeros_like(t)
    for k in range(7):
        f0 = 1200 * 2 ** (k / 5)
        f = f0 * (1.5 ** (t / d) if not c.get('down') else 1.5 ** (-t / d))
        s += np.sin(2 * np.pi * np.cumsum(f) / SR + k) * (.5 + .5 * np.sin(2 * np.pi * (5 + k) * t))
    return s * np.sin(np.pi * t / d) * .03


def S_popGhost(c):
    p = c.get('p', 0); d = .22; t = t_axis(d)
    return (sweep(500 + p * 90, 900 + p * 90, d) * .5 + band(noise(d), 1000, 5000) * .3) * np.exp(-t / .06) * .35


def S_wonder(c):
    out = np.zeros(int(.5 * SR))
    for k, (a, b) in enumerate([(420, 520), (520, 760)]):
        s = sweep(a, b, .12, 'square') * env_ad(int(.12 * SR), .003, .08) * .22
        i = int(k * .18 * SR); out[i:i + len(s)] += s
    return out


def S_poof(c):
    d = .45; t = t_axis(d)
    return band(noise(d), 200, 2500) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2 * np.exp(-t / .25) * .4


def S_whoosh(c):
    d = c.get('d', .8); n = int(d * SR); t = t_axis(d)
    x = noise(d)
    # moving band: crossfade three bands
    lo = band(x, 200, 900); mid = band(x, 800, 3000); hi = band(x, 2500, 8000)
    u = t / d
    s = lo * (1 - u) ** 2 + mid * 2 * u * (1 - u) * 1.4 + hi * u ** 2 * .8
    return s * np.sin(np.pi * u) ** 1.5 * (.18 if c.get('soft') else .32)


def S_pencil(c):
    d = c.get('d', 2.0); t = t_axis(d)
    am = np.clip(np.sin(2 * np.pi * 6.5 * t + 3 * np.sin(2 * np.pi * 1.1 * t)), 0, 1)
    return band(noise(d), 3000, 9000) * (.15 + am) * np.sin(np.pi * t / d) ** .3 * .1


def S_flip(c):
    out = np.zeros(int(.3 * SR))
    for k in range(2):
        s = band(noise(.06), 600, 5000) * env_ad(int(.06 * SR), .002, .015) * .4
        i = int(k * .11 * SR); out[i:i + len(s)] += s
    return out


def S_note(c):
    return marimba(midi(72 + c.get('p', 0))) * .8


def S_thud(c):
    d = .45; t = t_axis(d)
    s = sweep(90, 40, d) * np.exp(-t / .13) + band(noise(d), 100, 1500) * np.exp(-t / .04) * .5
    return s * (.45 if c.get('soft') else .85)


def S_plink(c):
    d = .2; t = t_axis(d)
    return sweep(1600, 900, d) * np.exp(-t / .05) * .3


def S_chug(c):
    d = c.get('d', .5); out = np.zeros(int((d + .1) * SR))
    k = 0
    while k * (1 / 13) < d:
        s = band(noise(.05), 400, 3500) * env_ad(int(.05 * SR), .001, .01) * .35
        tt = t_axis(.05); s += np.sin(2 * np.pi * (120 if k % 2 else 95) * tt) * np.exp(-tt / .02) * .4
        i = int(k / 13 * SR); out[i:i + len(s)] += s; k += 1
    return out * .7


def S_ding(c):
    return bell(midi([84, 86, 88, 91][c.get('p', 0) % 4]), 1.0, .7) * .55


def S_popDot(c):
    p = c.get('p', 0); return S_pop({'p': 1.0 + .15 * p}) * 1.1


def S_patter(c):
    d = c.get('d', 1.8); out = np.zeros(int((d + .1) * SR)); pr = np.random.default_rng(5)
    for k in range(48):
        tt = pr.random() * d * .9 + .45 * (k / 48)
        f = 1800 + pr.random() * 1600; s = woodblock(f) * .35
        i = int(min(tt, d) * SR); out[i:i + len(s)] += s[: len(out) - i]
    return out


def S_click(c):
    d = .03; t = t_axis(d)
    return (band(noise(d), 2000, 8000) * np.exp(-t / .003) * .5 + np.sin(2 * np.pi * (2400 + c.get('p', 0) * 60) * t) * np.exp(-t / .006) * .3) * .7


def S_slide(c):
    d = c.get('d', 2.6); t = t_axis(d)
    x = 1.9 * (1 - t / d) * np.sin(2 * np.pi * t / 1.3)
    h = x ** 2 / 3.6  # height on the parabola, 0..1
    sp = np.abs(np.cos(2 * np.pi * t / 1.3)) * (1 - t / d)  # speed
    s = band(noise(d), 300, 3000) * (.15 + sp) * .25
    f = 300 + 500 * h
    s += np.sin(2 * np.pi * np.cumsum(f) / SR) * .08 * (1 - t / d)
    return s * np.minimum(1, t / .05)


def S_ping(c):
    p = c.get('p', 0)
    return bell(midi({0: 79, 1: 84, 4: 88}[p]), 1.2, .5) * .5


def S_chime(c):
    a = bell(midi([72, 76, 79][c.get('p', 0)]), 2.2, .9) * .6
    b = bell(midi([84, 88, 91][c.get('p', 0)]), 1.2, .4) * .2
    a[:len(b)] += b
    return a


def S_hum(c):
    t = t_axis(DUR)
    s = (np.sin(2 * np.pi * 60 * t) * .5 + np.sin(2 * np.pi * 120 * t) * .2) * .02
    s += band(noise(DUR), 80, 600) * .012
    fade = np.clip(np.minimum(t / 1.5, (88 - t) / 1.5), 0, 1)
    # hum is louder in the empty terminal, softer once the paper stage is in
    lvl = np.where((t < 4.5) | (t > 84), 1.0, .45)
    return s * fade * lvl


SFX = {k[2:]: v for k, v in globals().items() if k.startswith('S_')}
PAN = {'hop': 0, 'land': 0}


def main():
    cues = json.load(open(sys.argv[1]))
    build_music()
    for c in cues:
        fn = SFX.get(c['type'])
        if fn is None:
            print('missing sfx', c['type']); continue
        s = fn(c)
        pan = float(np.clip((rng.random() - .5) * .4, -.3, .3))
        sfx(s, c['t'], 1.0, pan)
    # simple stereo reverb (FFT convolution with decaying noise IR)
    def ir(seed, d=1.8):
        r = np.random.default_rng(seed); t = t_axis(d)
        h = r.standard_normal(len(t)) * np.exp(-t / .45)
        h = band(h, 150, 6000); return h / np.sqrt(np.sum(h ** 2))
    def conv(x, h):
        n = len(x) + len(h)
        return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(h, n), n)[: len(x)]
    hl, hr = ir(1), ir(2)
    mL = ML + .32 * conv(ML, hl); mR = MR + .32 * conv(MR, hr)
    sL = L + .16 * conv(L, hl); sR = R + .16 * conv(R, hr)
    # music bed level & end fade
    t = np.arange(N) / SR
    mfade = np.clip((88.4 - t) / 2.2, 0, 1) * np.clip(t / .8, 0, 1)
    mpk = max(np.abs(mL).max(), np.abs(mR).max())
    mL *= .30 / mpk * mfade; mR *= .30 / mpk * mfade
    outL = mL + sL * .62; outR = mR + sR * .62
    pk = max(np.abs(outL).max(), np.abs(outR).max())
    g = .89 / pk if pk > .89 else 1.0
    outL = np.tanh(outL * g * 1.1) / np.tanh(1.1); outR = np.tanh(outR * g * 1.1) / np.tanh(1.1)
    st = np.stack([outL, outR], 1)
    st = (np.clip(st, -1, 1) * 32767 * .97).astype('<i2')
    import wave
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
    print('wrote', sys.argv[2], 'music peak', mpk, 'mix peak', pk)


if __name__ == '__main__':
    main()
