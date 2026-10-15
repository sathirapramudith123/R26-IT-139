// Shared date helpers for the "Try it yourself" prediction screens.

/// ISO week / year of [d] (the Thursday of the week decides the year).
({int year, int week}) isoWeekOf(DateTime d) {
  final day = DateTime.utc(d.year, d.month, d.day);
  final thursday = day.add(Duration(days: 4 - day.weekday));
  final week = ((thursday.difference(DateTime.utc(thursday.year, 1, 1)).inDays) ~/ 7) + 1;
  return (year: thursday.year, week: week);
}

/// Days until the next Avurudu (14 April).
int daysToAvurudu(DateTime d) {
  final today = DateTime(d.year, d.month, d.day);
  var next = DateTime(today.year, 4, 14);
  if (next.isBefore(today)) next = DateTime(today.year + 1, 4, 14);
  return next.difference(today).inDays;
}
