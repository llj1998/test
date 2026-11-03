#!/usr/bin/env python3
"""把 index.html + styles.css + data.js + world.js + app.js 打包成一个可以双击打开的 html。

用法（在 yuanfang/ 目录下）：
    python3 tools/build_single.py            # 输出 dist/远方清单.html
    python3 tools/build_single.py out.html   # 指定输出路径

只做字符串替换，不压缩、不改代码。外部依赖只有 Google Fonts 的样式表链接。
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCRIPTS = ['data.js', 'world.js', 'app.js']


def build() -> str:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'styles.css').read_text(encoding='utf-8')
    link = '<link rel="stylesheet" href="styles.css">'
    if link not in html:
        raise SystemExit('index.html 里找不到 styles.css 的 <link>，没法内联')
    html = html.replace(link, '<style>\n' + css + '\n</style>')
    for name in SCRIPTS:
        src = (ROOT / name).read_text(encoding='utf-8')
        if '</script' in src:
            raise SystemExit(f'{name} 里出现了 </script，内联会截断脚本')
        tag = f'<script src="{name}"></script>'
        if tag not in html:
            raise SystemExit(f'index.html 里找不到 {tag}')
        html = html.replace(tag, '<script>\n' + src + '\n</script>')
    return html


def main() -> None:
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist' / '远方清单.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    text = build()
    out.write_text(text, encoding='utf-8')
    print(f'已生成 {out}（{len(text) // 1024} KB）')


if __name__ == '__main__':
    main()
