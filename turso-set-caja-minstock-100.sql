-- Keep packaging box supplies C4/C10 at the default alert minimum of 100 units.
UPDATE Supply
SET minStock = 100
WHERE code IN ('C4', 'C10');
