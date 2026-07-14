import '../core/api.dart';

class InsightsService {
  static Future<Map<String, dynamic>> get() async {
    final data = await Api.get("/insights");
    if (data is Map<String, dynamic>) return data;
    return {};
  }
}