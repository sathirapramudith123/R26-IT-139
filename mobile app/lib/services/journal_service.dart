import '../core/api.dart';


class JournalService {
  
  static Future<Map<String, dynamic>> get({int? year, int? month, String? date}) async {
    final qp = <String, String>{};
    if (date != null) qp["date"] = date;
    if (year != null) qp["year"] = "$year";
    if (month != null) qp["month"] = "$month";
    final query = qp.isEmpty ? "" : "?" + qp.entries.map((e) => "${e.key}=${e.value}").join("&");
    final data = await Api.get("/transactions/journal$query");
    return (data is Map<String, dynamic>) ? data : {};
  }
}