import pytest
from app.browser.detector import classify_control, is_submit_control, filter_fillable_fields
from app.browser.mapper import score_field_match, find_best_field_match, find_matching_option
from app.browser.models import FormElement, SelectOption

def test_classify_control():
    assert classify_control({"tag": "input", "type": "text"}) == "text"
    assert classify_control({"tag": "input", "type": "email"}) == "text"
    assert classify_control({"tag": "select"}) == "select"
    assert classify_control({"tag": "input", "type": "checkbox"}) == "checkbox"
    assert classify_control({"tag": "input", "type": "radio"}) == "radio"
    assert classify_control({"tag": "button"}) == "button"
    assert classify_control({"tag": "input", "type": "submit"}) == "button"

def test_filter_fillable_fields():
    elements = [
        FormElement(elementIndex=0, tagName="input", type="text", label="Name"),
        FormElement(elementIndex=1, tagName="button", type="button", label="Cancel"),
        FormElement(elementIndex=2, tagName="button", type="submit", label="Submit Registration"),
        FormElement(elementIndex=3, tagName="select", label="Grade"),
    ]
    fillable = filter_fillable_fields(elements)
    assert len(fillable) == 2
    assert fillable[0].label == "Name"
    assert fillable[1].label == "Grade"

def test_field_mapper_scoring_and_best_match():
    elements = [
        FormElement(elementIndex=0, tagName="input", type="text", id="student_name", label="Full Name of Student"),
        FormElement(elementIndex=1, tagName="input", type="text", id="dob", label="Date of Birth (DOB)"),
        FormElement(elementIndex=2, tagName="select", id="gender", label="Gender / Sex"),
    ]

    match_name = find_best_field_match("student.fullName", elements)
    assert match_name is not None
    assert match_name.elementIndex == 0

    match_dob = find_best_field_match("student.dateOfBirth", elements)
    assert match_dob is not None
    assert match_dob.elementIndex == 1

    match_gender = find_best_field_match("student.gender", elements)
    assert match_gender is not None
    assert match_gender.elementIndex == 2

def test_find_matching_option():
    el = FormElement(
        elementIndex=0,
        tagName="select",
        options=[
            SelectOption(value="", text="-- Select Grade --"),
            SelectOption(value="7", text="Grade 7"),
            SelectOption(value="8", text="Grade 8"),
            SelectOption(value="9", text="Grade 9"),
        ],
    )
    assert find_matching_option("Grade 8", el) == "Grade 8"
    assert find_matching_option("8", el) == "Grade 8"
    assert find_matching_option("9", el) == "Grade 9"
