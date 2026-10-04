import { Link } from "react-router-dom";
import { Image as ImageIcon, Plus, Star } from "lucide-react";
import { foodImage, money } from "../services/api";
import { useCart } from "../context/CartContext";

export default function FoodCard({ food, category }) {
  const { add } = useCart();
  return (
    <article className="food-card">
      <Link to={`/food/${food.id}`} className="food-card-image">
        {foodImage(food) ? (
          <img src={foodImage(food)} alt={food.name} loading="lazy" />
        ) : (
          <span className="food-image-empty">
            <ImageIcon size={34} />
            No image available
          </span>
        )}
      </Link>
      <div className="food-card-body">
        <Link to={`/food/${food.id}`} className="food-card-title">
          {food.name}
        </Link>
        {category && <span className="food-category">{category}</span>}
        {food.description && (
          <p className="food-description">{food.description}</p>
        )}
        <div className="food-card-meta">
          <span>
            {food.review_count > 0 && (
              <>
                <Star size={14} fill="currentColor" /> {food.average_rating}{" "}
                <small>({food.review_count})</small>
              </>
            )}
          </span>
          <span className={food.is_available ? "stock" : "stock off"}>
            {food.is_available ? "Available" : "Sold out"}
          </span>
        </div>
        <div className="food-card-foot">
          <strong>{money(food.price)}</strong>
          <button
            className="round-add"
            aria-label={`Add ${food.name} to cart`}
            disabled={!food.is_available}
            onClick={() => add(food)}
          >
            <Plus size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}
