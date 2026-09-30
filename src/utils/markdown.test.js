import { describe, it, expect } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('mermaid 代码块渲染为占位块，兼容大小写与附加参数', () => {
    for (const fence of ['mermaid', 'Mermaid', 'mermaid {theme: dark}']) {
      const html = renderMarkdown('```' + fence + '\ngraph TD\n  A-->B\n```')
      const box = document.createElement('div')
      box.innerHTML = html
      const block = box.querySelector('pre.mermaid-block')
      expect(block, fence).not.toBeNull()
      expect(decodeURIComponent(block.dataset.code)).toBe('graph TD\n  A-->B\n')
    }
  })

  it('普通代码块不当作 mermaid', () => {
    expect(renderMarkdown('```js\nconst a = 1\n```')).not.toContain('mermaid-block')
  })

  it('原始 HTML 不渲染，防止 XSS', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"><script>alert(1)</script>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script')
  })

  it('链接新开页并带 noopener', () => {
    const html = renderMarkdown('[文档](https://example.com)')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})
