from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewWrite(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=1, max_length=1000)


class ReviewRead(ReviewWrite):
    id: int
    food_id: int
    customer_id: int
    customer_name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
