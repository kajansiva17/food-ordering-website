from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator, model_validator

from app.schemas.nutrition import NutritionRead


class FoodCreate(BaseModel):
    category_id: int
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    ingredients: str | None = None
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    image_url: str | None = Field(default=None, max_length=500)
    is_available: StrictBool = True

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name cannot be empty")
        return value


class FoodUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    ingredients: str | None = None
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    image_url: str | None = Field(default=None, max_length=500)
    is_available: StrictBool | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        return FoodCreate.normalize_name(value) if value is not None else None

    @model_validator(mode="after")
    def required_fields_cannot_be_null(self):
        for field in ("category_id", "name", "price", "is_available"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class FoodRead(FoodCreate):
    id: int
    average_rating: Decimal | None = None
    review_count: int = 0
    nutrition: NutritionRead | None = None
    model_config = ConfigDict(from_attributes=True)

