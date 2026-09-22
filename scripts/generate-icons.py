#!/usr/bin/env python3
"""Generate PWA app icons for Tender Hours.

Outputs to /home/z/my-project/public/:
  icon-192.png          — 192x192 (Android manifest)
  icon-512.png          — 512x512 (Android manifest + splash)
  apple-touch-icon.png — 180x180 (iOS home screen)
  maskable-192.png     — 192x192 with safe-zone padding (adaptive icon)
  maskable-512.png     — 512x512 with safe-zone padding
  favicon-32.png       — 32x32
  favicon-16.png       — 16x16
"""

from PIL import Image, ImageDraw, ImageFilter
import math
import os

OUTPUT_DIR = "/home/z/my-project/public"
os.makedirs(OUTPUT_DIR, exist_ok=True)

BG_TOP = (16, 122, 87)      # emerald-700
BG_BOTTOM = (5, 80, 60)     # deeper emerald
MOON_FILL = (253, 230, 138) # amber-100
RING_FILL = (255, 255, 255)
HAND_FILL = (255, 255, 255)


def make_gradient_bg(size, top, bottom):
    img = Image.new("RGB", (size, size), top)
    px = img.load()
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        for x in range(size):
            px[x, y] = (r, g, b)
    return img


def draw_icon(size, padding=0):
    bg = make_gradient_bg(size, BG_TOP, BG_BOTTOM)

    # Soft inner glow
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = size // 2, size // 2
    glow_radius = int(size * 0.42)
    for r in range(glow_radius, 0, -2):
        alpha = int(60 * (1 - r / glow_radius) ** 2)
        glow_draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(255, 255, 255, alpha),
        )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=size * 0.02))
    bg = Image.alpha_composite(bg.convert("RGBA"), glow).convert("RGB")

    draw = ImageDraw.Draw(bg)

    pad_px = int(size * padding)
    inner_size = size - 2 * pad_px
    inner_cx = size // 2
    inner_cy = size // 2

    # Clock face ring
    ring_r = int(inner_size * 0.38)
    ring_w = max(2, int(inner_size * 0.025))
    ring_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ring_d = ImageDraw.Draw(ring_img)
    ring_d.ellipse(
        [
            inner_cx - ring_r,
            inner_cy - ring_r,
            inner_cx + ring_r,
            inner_cy + ring_r,
        ],
        outline=(*RING_FILL, 230),
        width=ring_w,
    )
    bg = Image.alpha_composite(bg.convert("RGBA"), ring_img).convert("RGB")
    draw = ImageDraw.Draw(bg)

    # Crescent moon
    moon_r = int(inner_size * 0.18)
    moon_cx = inner_cx + int(inner_size * 0.10)
    moon_cy = inner_cy - int(inner_size * 0.12)

    mask = Image.new("L", (size, size), 0)
    mask_d = ImageDraw.Draw(mask)
    mask_d.ellipse(
        [moon_cx - moon_r, moon_cy - moon_r, moon_cx + moon_r, moon_cy + moon_r],
        fill=255,
    )
    carve_r = int(moon_r * 0.85)
    carve_cx = moon_cx + int(moon_r * 0.45)
    carve_cy = moon_cy - int(moon_r * 0.10)
    mask_d.ellipse(
        [carve_cx - carve_r, carve_cy - carve_r, carve_cx + carve_r, carve_cy + carve_r],
        fill=0,
    )

    moon_bg = Image.new("RGBA", (size, size), (*MOON_FILL, 255))
    moon_with_alpha = Image.composite(
        moon_bg, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask
    )
    bg = Image.alpha_composite(bg.convert("RGBA"), moon_with_alpha).convert("RGB")
    draw = ImageDraw.Draw(bg)

    # Clock hands (10:10 position)
    hand_w = max(2, int(inner_size * 0.03))
    hand_len_minute = int(ring_r * 0.72)
    hand_len_hour = int(ring_r * 0.50)

    minute_angle = -math.radians(60)
    minute_end = (
        inner_cx + int(hand_len_minute * math.sin(minute_angle)),
        inner_cy - int(hand_len_minute * math.cos(minute_angle)),
    )
    draw.line([(inner_cx, inner_cy), minute_end], fill=HAND_FILL, width=hand_w)
    cap_r = hand_w // 2 + 1
    draw.ellipse(
        [minute_end[0] - cap_r, minute_end[1] - cap_r, minute_end[0] + cap_r, minute_end[1] + cap_r],
        fill=HAND_FILL,
    )

    hour_angle = -math.radians(-60)
    hour_end = (
        inner_cx + int(hand_len_hour * math.sin(hour_angle)),
        inner_cy - int(hand_len_hour * math.cos(hour_angle)),
    )
    draw.line([(inner_cx, inner_cy), hour_end], fill=HAND_FILL, width=int(hand_w * 1.2))
    cap_r2 = int(hand_w * 0.6) + 1
    draw.ellipse(
        [hour_end[0] - cap_r2, hour_end[1] - cap_r2, hour_end[0] + cap_r2, hour_end[1] + cap_r2],
        fill=HAND_FILL,
    )

    # Center dot
    dot_r = max(2, int(inner_size * 0.025))
    draw.ellipse(
        [inner_cx - dot_r, inner_cy - dot_r, inner_cx + dot_r, inner_cy + dot_r],
        fill=(255, 255, 255),
    )

    # Tick marks at 12/3/6/9
    tick_r_outer = ring_r - int(ring_w * 0.6)
    tick_r_inner = ring_r - int(ring_w * 0.6) - max(2, int(inner_size * 0.03))
    for ang_deg in (0, 90, 180, 270):
        a = math.radians(ang_deg)
        x1 = inner_cx + int(tick_r_outer * math.sin(a))
        y1 = inner_cy - int(tick_r_outer * math.cos(a))
        x2 = inner_cx + int(tick_r_inner * math.sin(a))
        y2 = inner_cy - int(tick_r_inner * math.cos(a))
        draw.line([(x1, y1), (x2, y2)], fill=(255, 255, 255), width=max(2, int(inner_size * 0.012)))

    return bg


def main():
    for size, name in [
        (16, "favicon-16.png"),
        (32, "favicon-32.png"),
        (180, "apple-touch-icon.png"),
        (192, "icon-192.png"),
        (512, "icon-512.png"),
    ]:
        img = draw_icon(size, padding=0)
        path = os.path.join(OUTPUT_DIR, name)
        img.save(path, "PNG")
        print(f"saved {path} ({size}x{size})")

    for size, name in [
        (192, "maskable-192.png"),
        (512, "maskable-512.png"),
    ]:
        img = draw_icon(size, padding=0.10)
        path = os.path.join(OUTPUT_DIR, name)
        img.save(path, "PNG")
        print(f"saved {path} ({size}x{size}, maskable)")


if __name__ == "__main__":
    main()
