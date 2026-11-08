"""Package generated PNG icon sizes into the macOS ICNS container."""
from pathlib import Path
import struct
root = Path(__file__).resolve().parent.parent
chunks = []
for kind, name in [(b'ic07', 'icon_128x128.png'), (b'ic08', 'icon_256x256.png'), (b'ic09', 'icon_512x512.png'), (b'ic10', 'icon_512x512@2x.png')]:
    data = (root / 'build/AppIcon.iconset' / name).read_bytes()
    chunks.append(kind + struct.pack('>I', len(data) + 8) + data)
payload = b''.join(chunks)
(root / 'macos/AppIcon.icns').write_bytes(b'icns' + struct.pack('>I', len(payload) + 8) + payload)
