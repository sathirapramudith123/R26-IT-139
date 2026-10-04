import '../core/api.dart';

class InsightsService {
  static Future<Map<String, dynamic>> get() async {
    final data = await Api.get("/insights");
    if (data is Map<String, dynamic>) return data;
    return {};
  }

  /// Credit score with some of the shop's numbers changed → { base, scenario, delta }
  static Future<Map<String, dynamic>> creditWhatIf(Map<String, num> changes) async {
    final data = await Api.post("/insights/credit/what-if", {"changes": changes});
    return data is Map<String, dynamic> ? data : {};
  }

  /// Realistic improvements, each scored by the model → { score, status, actions: [...] }
  static Future<Map<String, dynamic>> creditActions() async {
    final data = await Api.get("/insights/credit/actions");
    return data is Map<String, dynamic> ? data : {};
  }
}
