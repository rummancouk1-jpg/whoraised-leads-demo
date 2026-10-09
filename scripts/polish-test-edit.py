from pathlib import Path
p=Path('tests/outreach.spec.ts');s=p.read_text().replace('conversionPriority }','conversionPriority, leadTier }');s=s.replace('  expect(audienceBand(5000))', '''  expect(leadTier(makeLead({ audience_size: 999 }))).toBe("long-tail");
  expect(leadTier(makeLead({ audience_size: 0 }))).toBe("long-tail");
  expect(leadTier(makeLead({ audience_size: 1000 }))).toBe("priority");
  expect(leadTier(makeLead({ fit_evidence: "Indian and European index coverage" }))).toBe("long-tail");
  expect(audienceBand(5000))''');p.write_text(s)
