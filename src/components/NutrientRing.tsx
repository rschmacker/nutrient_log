import { formatNumber, type Nutrient } from '../nutrients'

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type Props = {
  nutrient: Nutrient
  value: number
  target: number
  onOpen: () => void // tapping the ring shows which foods the value comes from
}

// Progress ring: how much of the daily target is reached. Always green; at 100 % and
// above the ring is simply full and the percentage shows how much (no warning colors).
export default function NutrientRing({ nutrient, value, target, onOpen }: Props) {
  const ratio = target > 0 ? value / target : 0
  const percent = Math.round(ratio * 100)
  const filled = Math.min(ratio, 1) * CIRCUMFERENCE
  const percentText = `${percent}%`
  const valueText = `${formatNumber(value, nutrient.decimals)} ${nutrient.unit}`
  const targetText = formatNumber(target, nutrient.decimals)
  const description =
    `${nutrient.label}: ${valueText} von ${targetText} ${nutrient.unit}, ${percent} Prozent. ` +
    'Zeigt, woher der Wert kommt.'

  return (
    <button className="ring" aria-label={description} onClick={onOpen}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r={RADIUS} />
        {filled > 0 && (
          <circle
            className="ring-fill"
            cx="50"
            cy="50"
            r={RADIUS}
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            transform="rotate(-90 50 50)"
          />
        )}
        <text
          className={percentText.length > 4 ? 'ring-percent long' : 'ring-percent'}
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {percentText}
        </text>
      </svg>
      <span className="ring-name">{nutrient.short}</span>
      <span className="ring-text">{valueText}</span>
      <span className="ring-text">von {targetText}</span>
    </button>
  )
}
