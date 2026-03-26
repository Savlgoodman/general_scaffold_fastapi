"""所有对外 Schema 的驼峰基类。"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """自动 snake_case → camelCase 的基类。"""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
