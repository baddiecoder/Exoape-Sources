# Task Template

Target: <site>
Objective: <system to find>

Required outputs:
1. reports/<site>/signature-index.md
2. reports/<site>/control-flow-map.md
3. reports/<site>/module-classification.md
4. reports/<site>/unknowns.md

Method:
- Search local extracted files only.
- Start from known anchors and trace callers/consumers.
- Record evidence snippets with stable IDs.

Acceptance:
- Frame owner identified (or unknown explicitly).
- Transition/menu/loader ownership stated with confidence labels.
