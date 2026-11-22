// Draws an icon from iconData.js as react-pdf SVG, so it stays a sharp vector shape in the PDF.
// The whole icon is drawn in the single color passed in.
import { Circle, Line, Path, Polygon, Polyline, Rect, Svg } from '@react-pdf/renderer'

const OUTLINE_SHAPES = { path: Path, rect: Rect, circle: Circle, line: Line, polyline: Polyline, polygon: Polygon }
const NUMERIC = /^-?\d*\.?\d+$/
const toProps = (attrs) =>
  Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, NUMERIC.test(v) ? Number(v) : v]))

export function Icon({ icon, size, color, style }) {
  if (!icon) return null
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} style={style}>
      {icon.kind === 'filled' ? (
        <Path d={icon.d} fill={color} fillRule={icon.fillRule} />
      ) : (
        icon.nodes.map(([tag, attrs], i) => {
          const Shape = OUTLINE_SHAPES[tag]
          return (
            Shape && (
              <Shape
                key={i}
                {...toProps(attrs)}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          )
        })
      )}
    </Svg>
  )
}
