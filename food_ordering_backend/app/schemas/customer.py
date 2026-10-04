from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=1, max_length=30)
    address: str = Field(min_length=1, max_length=500)

    @field_validator("name", "phone", "address")
    @classmethod
    def nonblank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("value cannot be empty")
        return value


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=1, max_length=30)
    address: str | None = Field(default=None, min_length=1, max_length=500)

    @field_validator("name", "phone", "address")
    @classmethod
    def nonblank(cls, value: str | None) -> str | None:
        return CustomerCreate.nonblank(value) if value is not None else None

    @model_validator(mode="after")
    def required_fields_cannot_be_null(self):
        for field in ("name", "email", "phone", "address"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class CustomerRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str
    address: str
    role: str
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

