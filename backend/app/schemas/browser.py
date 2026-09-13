from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class SelectOption(BaseModel):
    value: str
    text: str

class FormElement(BaseModel):
    elementIndex: int
    tagName: str
    type: str = ""
    classification: str = "unknown"
    id: str = ""
    name: str = ""
    label: str = ""
    placeholder: str = ""
    ariaLabel: str = ""
    ariaLabelledBy: str = ""
    ariaDescribedBy: str = ""
    legend: str = ""
    section: str = ""
    required: bool = False
    disabled: bool = False
    readOnly: bool = False
    value: str = ""
    currentValue: str = ""
    checked: bool = False
    selectedText: str = ""
    selectedValue: str = ""
    options: List[SelectOption] = Field(default_factory=list)
    isSubmit: bool = False
    isConsent: bool = False
    actionType: Optional[str] = None
    step: Optional[int] = None

class FormSnapshot(BaseModel):
    url: str
    elements: List[FormElement] = Field(default_factory=list)

class VerifyResult(BaseModel):
    elementIndex: int
    expected: str
    actual: str
    matches: bool
    controlType: str = "text"
    details: str = ""
