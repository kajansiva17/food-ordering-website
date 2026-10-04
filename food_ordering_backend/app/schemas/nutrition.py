from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class NutritionWrite(BaseModel):
    calories: int | None = Field(default=None, ge=0)
    protein: Decimal | None = Field(default=None, ge=0)
    carbohydrates: Decimal | None = Field(default=None, ge=0)
    fat: Decimal | None = Field(default=None, ge=0)
    fiber: Decimal | None = Field(default=None, ge=0)
    sugar: Decimal | None = Field(default=None, ge=0)
    sodium: Decimal | None = Field(default=None, ge=0)


class NutritionRead(NutritionWrite):
    id: int
    food_id: int
    model_config = ConfigDict(from_attributes=True)
