@echo off
echo Charlotte — Applying PR Bundle
echo This should be run from your REPO ROOT (where .git folder lives).
pause
copy /Y .nojekyll .\.nojekyll >nul
python rooms_checker.py --root .
echo Done. Review changes with:  git status
pause
