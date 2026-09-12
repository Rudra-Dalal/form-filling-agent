from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ExtractedField(BaseModel):
    label: str
    value: str
    confidence: str = "high"

class StudentInfo(BaseModel):
    fullName: Optional[str] = None
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
    grade: Optional[str] = None
    applicantName: Optional[str] = None

class ParentInfo(BaseModel):
    fatherName: Optional[str] = None
    motherName: Optional[str] = None
    contactNumber: Optional[str] = None

class AddressInfo(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    residentialAddress: Optional[str] = None

class CanonicalRecord(BaseModel):
    student: StudentInfo = Field(default_factory=StudentInfo)
    parent: ParentInfo = Field(default_factory=ParentInfo)
    address: AddressInfo = Field(default_factory=AddressInfo)

class UnmappedField(BaseModel):
    label: str
    value: str
    reason: Optional[str] = None

class DocumentData(BaseModel):
    rawText: str = ""
    fields: List[ExtractedField] = Field(default_factory=list)
    record: CanonicalRecord = Field(default_factory=CanonicalRecord)
    student: StudentInfo = Field(default_factory=StudentInfo)
    parent: ParentInfo = Field(default_factory=ParentInfo)
    address: AddressInfo = Field(default_factory=AddressInfo)
    unmapped: List[UnmappedField] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
