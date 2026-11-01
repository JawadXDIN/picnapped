#!/usr/bin/env python3
"""Generate simple PNG icons for the Picnapped Chrome extension."""
import struct
import zlib
import os

def create_png(width, height, pixels_rgb):
    """Create a minimal valid PNG file."""
    def write_chunk(chunk_type, data):
        chunk_len = len(data)
        chunk = struct.pack(">I", chunk_len) + chunk_type + data
        crc = zlib.crc32(chunk_type + data) & 0xffffffff
        return chunk + struct.pack(">I", crc)
    
    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'
    # IHDR
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr = write_chunk(b'IHDR', ihdr_data)
    # IDAT
    raw_rows = b''
    for y in range(height):
        raw_rows += b'\x00'  # filter type: none
        for x in range(width):
            raw_rows += bytes(pixels_rgb[y][x])
    compressed = zlib.compress(raw_rows)
    idat = write_chunk(b'IDAT', compressed)
    # IEND
    iend = write_chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

def lerp(a, b, t):
    return int(a + (b - a) * t)

def make_icon(size):
    pixels = []
    for y in range(size):
        row = []
        for x in range(size):
            # Check if inside rounded rectangle
            r = size * 0.18
            cx = x + 0.5
            cy = y + 0.5
            
            # Distance from rounded rect edges
            dx = max(r - cx, cx - (size - r), 0)
            dy = max(r - cy, cy - (size - r), 0)
            dist = (dx**2 + dy**2)**0.5
            
            if dist > r:
                # Transparent (outside)
                row.append([255, 255, 255])  # white bg
            else:
                # Gradient from purple to blue
                t = x / size
                rr = lerp(124, 59, t)   # 7C to 3B
                g  = lerp(58, 130, t)   # 3A to 82
                b  = lerp(237, 246, t)  # ED to F6
                
                # Draw camera lens (white circle with purple dot)
                center_x = size / 2
                center_y = size / 2
                d_from_center = ((cx - center_x)**2 + (cy - center_y)**2)**0.5
                
                if d_from_center < size * 0.22:
                    rr, g, b = 255, 255, 255  # white ring
                if d_from_center < size * 0.13:
                    rr, g, b = 124, 58, 237   # purple center
                if d_from_center < size * 0.06:
                    rr, g, b = 255, 255, 255  # white dot
                
                row.append([rr, g, b])
        pixels.append(row)
    return pixels

os.makedirs("public/icons", exist_ok=True)
for size in [16, 32, 48, 128]:
    pixels = make_icon(size)
    png_data = create_png(size, size, pixels)
    with open(f"public/icons/icon{size}.png", "wb") as f:
        f.write(png_data)
    print(f"Created icon{size}.png ({len(png_data)} bytes)")

print("All icons created!")
