import '../core/api.dart';

class PredictionService {
  static Future<Map<String, dynamic>> predict(String component, Map<String, dynamic> features) async =>
      (await Api.post("/predict/$component", {"features": features})) as Map<String, dynamic>;
}