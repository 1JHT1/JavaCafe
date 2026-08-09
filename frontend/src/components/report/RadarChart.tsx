/**
 * RadarChart —— 能力雷达图（自绘 SVG，无图表库依赖）
 *
 * 绘制：中心点向外均分 N 个能力轴，4 层同心网格多边形（25/50/75/100），
 * 数据多边形按 value/100 取半径连线，顶点画圆点，轴标签置于多边形外侧。
 * 维度最多 12 个，中文标签按 2 字/行自动换行（字母/数字标签保持单行），
 * 避免密集维度下文字互相覆盖。
 * 配色沿用咖啡主题：网格 brown-300、数据填充 accent 半透明、描边 accent。
 */
import type { RadarDatum } from '@/utils/insights';

interface RadarChartProps {
  /** 雷达图数据（已剔除无命中的维度，至少 3 维才有可读性） */
  data: RadarDatum[];
}

const CX = 170;
const CY = 150;
const RADIUS = 86;
const LABEL_R = RADIUS + 22;
const GRID_LEVELS = [0.25, 0.5, 0.75, 1];

/** 第 i 轴的角度（-90° 起顺时针均分） */
function angleAt(i: number, total: number): number {
  return (-90 + (i * 360) / total) * (Math.PI / 180);
}

function pointAt(angle: number, r: number): [number, number] {
  return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r];
}

/** 轴标签锚点：左侧靠右对齐、右侧靠左对齐、上下居中，避免文字溢出 */
function anchorFor(angle: number): { textAnchor: 'start' | 'middle' | 'end'; dy: number } {
  const cos = Math.cos(angle);
  if (cos > 0.3) return { textAnchor: 'start', dy: 4 };
  if (cos < -0.3) return { textAnchor: 'end', dy: 4 };
  return { textAnchor: 'middle', dy: Math.sin(angle) < 0 ? -6 : 14 };
}

/**
 * 中文标签按 2 字/行拆分（如"计算机网络"→["计算","机网络"]），
 * 字母/数字标签（JVM、Spring、MySQL 等）保持单行。
 */
function wrapLabel(text: string): string[] {
  const isLatin = /^[a-zA-Z0-9 .+-]+$/.test(text);
  if (isLatin && text.length <= 8) return [text];
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += 2) lines.push(text.slice(i, i + 2));
  // 末尾奇数单字并入前一行，如"计算机网络" → ["计算","机网络"]
  if (lines.length > 1 && lines[lines.length - 1].length === 1) {
    lines[lines.length - 2] += lines[lines.length - 1];
    lines.pop();
  }
  return lines;
}

export function RadarChart({ data }: RadarChartProps) {
  const total = data.length;
  if (total < 3) return null;

  const polygonPoints = (ratio: number): string =>
    data.map((_, i) => pointAt(angleAt(i, total), RADIUS * ratio).join(',')).join(' ');

  const valuePoints = data
    .map((d, i) => pointAt(angleAt(i, total), (Math.max(0, Math.min(100, d.value)) / 100) * RADIUS).join(','))
    .join(' ');

  return (
    <svg
      viewBox="0 0 340 300"
      className="w-full max-w-[340px]"
      role="img"
      aria-label="个人能力雷达图"
    >
      {/* 网格层（由外到内）+ 轴线 */}
      {GRID_LEVELS.map((level) => (
        <polygon
          key={level}
          points={polygonPoints(level)}
          fill="none"
          stroke="#BCAAA4" // brown-300
          strokeOpacity={level === 1 ? 0.6 : 0.35}
          strokeWidth={level === 1 ? 1.2 : 1}
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = pointAt(angleAt(i, total), RADIUS);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#BCAAA4" strokeOpacity={0.35} strokeWidth={1} />;
      })}

      {/* 数据多边形 */}
      <polygon points={valuePoints} fill="rgba(255,112,67,0.22)" stroke="#FF7043" strokeWidth={2} strokeLinejoin="round" />
      {data.map((d, i) => {
        const [x, y] = pointAt(angleAt(i, total), (Math.max(0, Math.min(100, d.value)) / 100) * RADIUS);
        return <circle key={i} cx={x} cy={y} r={3} fill="#FF7043" />;
      })}

      {/* 轴标签（多行时整体向轴外偏移，行间 12px） */}
      {data.map((d, i) => {
        const angle = angleAt(i, total);
        const [x, y] = pointAt(angle, LABEL_R);
        const { textAnchor, dy } = anchorFor(angle);
        const lines = wrapLabel(d.dimension);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={textAnchor}
            fontSize={10}
            fill="#5D4037" // brown-700
            className="select-none"
          >
            {lines.map((line, li) => (
              <tspan key={li} x={x} dy={li === 0 ? dy - (lines.length - 1) * 6 : 12}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}
