import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  Image as ImageIcon,
  Minus,
  Plus,
  Search,
  Star,
} from "lucide-react";
import FoodCard from "../components/FoodCard";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { api, apiError, foodImage, money } from "../services/api";
import heroBackground from "../assets/4133d72a-bc54-404c-b092-239e1104a33b.png";

export function Home() {
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get("/categories/", {
        params: { limit: 100 },
        signal: controller.signal,
      }),
      api.get("/foods/", { params: { limit: 100 }, signal: controller.signal }),
    ])
      .then(([a, b]) => {
        setCategories(a.data);
        setFoods(b.data);
      })
      .catch((e) => {
        if (e.code !== "ERR_CANCELED") setError(apiError(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const picturedFood = foods.find((food) => foodImage(food));
  const reviewed = [...foods]
    .filter((food) => food.review_count > 0)
    .sort(
      (a, b) =>
        Number(b.average_rating) - Number(a.average_rating) ||
        b.review_count - a.review_count,
    );
  const featured = (reviewed.length ? reviewed : foods).slice(0, 4);
  return (
    <>
      <section className="home-hero has-hero-image">
        <img
          className="hero-background"
          src={heroBackground}
          alt="Steaming chicken biryani with herbs"
        />
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="kicker">WELCOME TO OUR KITCHEN</span>
            <h1 className="hero-wordmark">
              <span>நம்ம</span>
              <span>கடை</span>
            </h1>
            <h2>Fresh Food. Happy People.</h2>
            <p>
              Choose from our real menu, place your order, and enjoy food made
              for your table.
            </p>
            <div className="hero-actions">
              <Link to="/menu" className="btn btn-red">
                Order now <ArrowRight size={18} />
              </Link>
              <Link to="/menu" className="btn btn-outline">
                View menu
              </Link>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-callout">
              <span className="callout-icon">✦</span>
              <h3>Freshly cooked goodness</h3>
              <p>Explore the dishes available from our kitchen.</p>
              <Link to="/menu">
                Explore menu <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="container section category-section">
        <div className="category-heading">
          <span className="kicker">EXPLORE OUR MENU</span>
          <h2>
            Something
            <br />
            for every
            <br />
            craving.
          </h2>
          <p>Find the food you love, made fresh from our kitchen.</p>
          <Link to="/menu" className="subtle-link">
            View full menu <ArrowRight size={16} />
          </Link>
        </div>
        <div className="category-content">
          {error && <p className="alert">{error}</p>}
          {loading ? (
            <div className="page-loader">Loading menu…</div>
          ) : categories.length ? (
            <div className="category-strip">
              {categories.map((category) => {
                const imageFood = foods.find(
                  (food) => food.category_id === category.id && foodImage(food),
                );
                return (
                  <Link
                    key={category.id}
                    to={`/menu?category_id=${category.id}`}
                    className="category-pill"
                  >
                    <span className="category-picture">
                      {imageFood ? (
                        <img src={foodImage(imageFood)} alt="" />
                      ) : (
                        <span className="category-picture-empty">
                          <ImageIcon size={32} />
                        </span>
                      )}
                    </span>
                    <span className="category-icon">✦</span>
                    <strong>{category.name}</strong>
                    {category.description && (
                      <small>{category.description}</small>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            !error && (
              <div className="empty-panel">No categories available yet.</div>
            )
          )}
        </div>
      </section>
      <section className="container section featured-section">
        <div className="section-heading center-heading">
          <div>
            <span className="kicker">FROM OUR KITCHEN</span>
            <h2>
              {reviewed.length ? "Customer favorites" : "Explore the menu"}
            </h2>
            <p>
              {reviewed.length
                ? "Dishes rated by our customers."
                : "Available dishes, added by our kitchen."}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="page-loader">Loading food…</div>
        ) : featured.length ? (
          <div className="food-grid">
            {featured.map((food) => (
              <FoodCard
                key={food.id}
                food={food}
                category={
                  categories.find((item) => item.id === food.category_id)?.name
                }
              />
            ))}
          </div>
        ) : (
          !error && (
            <div className="empty-panel">No food items available yet.</div>
          )
        )}
        {featured.length > 0 && (
          <div className="section-action">
            <Link to="/menu" className="btn btn-outline">
              View full menu <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>
      {picturedFood && (
        <section className="container home-feature">
          <div className="home-feature-copy">
            <span className="kicker">ON THE MENU</span>
            <h2>{picturedFood.name}</h2>
            {picturedFood.description && <p>{picturedFood.description}</p>}
            <Link to={`/food/${picturedFood.id}`} className="btn btn-cream">
              See this dish <ArrowRight size={17} />
            </Link>
          </div>
          <img src={foodImage(picturedFood)} alt={picturedFood.name} />
        </section>
      )}
      <section className="container section home-next">
        <div>
          <span className="kicker">READY WHEN YOU ARE</span>
          <h2>Good food is just a few taps away.</h2>
          <p>
            Browse the menu, choose your food, and follow your order from your
            account.
          </p>
          <Link to="/menu" className="btn btn-red">
            Start an order <ArrowRight size={17} />
          </Link>
        </div>
        <div className="home-next-art" aria-hidden="true">
          ✦
        </div>
      </section>
    </>
  );
}

export function Menu() {
  const [params, setParams] = useSearchParams();
  const categoryId = params.get("category_id") || "";
  const query = params.get("search") || "";
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState(query);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/categories/", { params: { limit: 100 } })
      .then(({ data }) => setCategories(data))
      .catch((e) => setError(apiError(e)));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSearch(query);
    api
      .get("/foods/", {
        params: {
          limit: 100,
          ...(categoryId && { category_id: categoryId }),
          ...(query && { search: query }),
          ...(!availableOnly && { include_unavailable: true }),
        },
        signal: controller.signal,
      })
      .then(({ data }) => setFoods(data))
      .catch((e) => {
        if (e.code !== "ERR_CANCELED") setError(apiError(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [categoryId, query, availableOnly]);
  const changeParams = (key, value) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      value ? next.set(key, value) : next.delete(key);
      return next;
    });
  return (
    <div className="container page-space">
      <div className="page-intro">
        <span className="kicker">FIND YOUR NEXT MEAL</span>
        <h1>Our menu</h1>
        <p>Everything you see here comes straight from our kitchen.</p>
      </div>
      <div className="menu-toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            changeParams("search", search.trim());
          }}
        >
          <Search size={19} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search food"
            aria-label="Search food"
          />
          <button className="btn btn-red">Search</button>
        </form>
        <label className="availability-filter">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
          />{" "}
          Available only
        </label>
      </div>
      <div className="menu-layout">
        <aside className="menu-sidebar">
          <h3>Categories</h3>
          <button
            className={!categoryId ? "active" : ""}
            onClick={() => changeParams("category_id", "")}
          >
            All food
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={categoryId === String(category.id) ? "active" : ""}
              onClick={() => changeParams("category_id", String(category.id))}
            >
              {category.name}
            </button>
          ))}
          {!categories.length && <small>No categories available yet.</small>}
        </aside>
        <div className="menu-main">
          {loading ? (
            <div className="page-loader">Loading food…</div>
          ) : error ? (
            <p className="alert">{error}</p>
          ) : foods.length ? (
            <div className="food-grid">
              {foods.map((food) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  category={
                    categories.find((item) => item.id === food.category_id)
                      ?.name
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-panel">No food items available yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FoodDetails() {
  const { id } = useParams();
  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [food, setFood] = useState(null);
  const [category, setCategory] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get(`/foods/${id}`, { signal: controller.signal }),
      api.get(`/foods/${id}/reviews`, { signal: controller.signal }),
    ])
      .then(([a, b]) => {
        setFood(a.data);
        setReviews(b.data);
        return api.get(`/categories/${a.data.category_id}`, {
          signal: controller.signal,
        });
      })
      .then(({ data }) => setCategory(data))
      .catch((e) => {
        if (e.code !== "ERR_CANCELED") setError(apiError(e));
      });
    return () => controller.abort();
  }, [id]);
  const submitReview = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/foods/${id}/reviews`, {
        rating: Number(rating),
        comment,
      });
      const { data } = await api.get(`/foods/${id}/reviews`);
      setReviews(data);
      setComment("");
      setMessage("Review submitted.");
    } catch (err) {
      setError(apiError(err));
    }
  };
  if (error && !food)
    return <div className="container page-space alert">{error}</div>;
  if (!food) return <div className="page-loader">Loading food…</div>;
  return (
    <div className="container page-space">
      <div className="breadcrumb">
        <Link to="/menu">Menu</Link> / {food.name}
      </div>
      <div className="detail-grid">
        <div className="detail-image">
          {foodImage(food) ? (
            <img src={foodImage(food)} alt={food.name} />
          ) : (
            <span className="food-image-empty">
              <ImageIcon size={55} />
              No image available
            </span>
          )}
        </div>
        <div className="detail-info">
          {category && <span className="kicker">{category.name}</span>}
          <h1>{food.name}</h1>
          {food.review_count > 0 && (
            <div className="rating-line">
              <Star size={18} fill="currentColor" /> {food.average_rating}{" "}
              <span>({food.review_count} reviews)</span>
            </div>
          )}
          <strong className="detail-price">{money(food.price)}</strong>
          {food.description && <p>{food.description}</p>}
          {food.ingredients && (
            <p>
              <strong>Ingredients:</strong> {food.ingredients}
            </p>
          )}
          <span className={`availability ${food.is_available ? "" : "off"}`}>
            {food.is_available ? "Available" : "Currently unavailable"}
          </span>
          <div className="quantity-row">
            <span>Quantity</span>
            <div className="stepper">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
              >
                <Minus size={17} />
              </button>
              <b>{quantity}</b>
              <button
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Increase quantity"
              >
                <Plus size={17} />
              </button>
            </div>
          </div>
          <button
            className="btn btn-red"
            disabled={!food.is_available}
            onClick={() => {
              add(food, quantity);
              navigate("/cart");
            }}
          >
            Add to cart <ArrowRight size={17} />
          </button>
        </div>
      </div>
      {food.nutrition && (
        <section className="detail-extra panel">
          <h2>Nutrition</h2>
          <div className="nutrition-grid">
            {Object.entries(food.nutrition)
              .filter(
                ([key, value]) =>
                  !["id", "food_id"].includes(key) && value != null,
              )
              .map(([key, value]) => (
                <div key={key}>
                  <span>{key.replaceAll("_", " ")}</span>
                  <strong>
                    {value}
                    {key === "calories" ? " kcal" : " g"}
                  </strong>
                </div>
              ))}
          </div>
        </section>
      )}
      <section className="detail-extra panel">
        <h2>Reviews</h2>
        {reviews.length ? (
          reviews.map((review) => (
            <article className="review-item" key={review.id}>
              <strong>{review.customer_name}</strong>
              <span>{"★".repeat(review.rating)}</span>
              <p>{review.comment}</p>
            </article>
          ))
        ) : (
          <p className="muted">No reviews yet.</p>
        )}
        {user ? (
          <form className="review-form" onSubmit={submitReview}>
            <h3>Write a review</h3>
            <label>
              Rating
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              Comment
              <textarea
                required
                maxLength={1000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
            <button className="btn btn-red">Submit review</button>
            {message && <p className="success">{message}</p>}
            {error && <p className="alert">{error}</p>}
          </form>
        ) : (
          <p>
            <Link to="/login">Log in</Link> to leave a review.
          </p>
        )}
      </section>
    </div>
  );
}
