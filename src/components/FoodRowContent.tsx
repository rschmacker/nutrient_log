import type { Food } from '../foods'
import { formatNumber } from '../nutrients'

// Inside of a food row in a list: name (with a "Gericht" tag for dishes), portion, kcal
export default function FoodRowContent({ food }: { food: Food }) {
  return (
    <>
      <span className="food-text">
        <span className="food-name">
          {food.name}
          {food.kind === 'dish' && <span className="tag">Gericht</span>}
        </span>
        <span className="food-portion">{food.portion}</span>
      </span>
      <span className="food-kcal">{formatNumber(food.kcal, 0)} kcal</span>
    </>
  )
}
