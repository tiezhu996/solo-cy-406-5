function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 占位符语法 {{name}} 的唯一来源：渲染替换与变量重命名共用，
 * 允许花括号与变量名之间存在空白字符。
 */
export function buildPlaceholderPattern(name: string) {
  return new RegExp(`{{\\s*${escapeRegExp(name)}\\s*}}`, 'g');
}
