import '../core/api.dart';

/// Agent float / settlement bank accounts (points 1,5,6,7).
class AgentBankService {
  static const _path = "/agent-banks";

  static Future<List<Map<String, dynamic>>> list() async {
    final data = await Api.get(_path);
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  static Future<Map<String, dynamic>> create(Map<String, dynamic> body) async =>
      (await Api.post(_path, body)) as Map<String, dynamic>;

  static Future<Map<String, dynamic>> topup(String id, num amount) async =>
      (await Api.post("$_path/$id/topup", {"amount": amount})) as Map<String, dynamic>;

  static Future<Map<String, dynamic>> ledger(String id) async =>
      (await Api.get("$_path/$id/ledger")) as Map<String, dynamic>;

  static Future<void> remove(String id) async => Api.delete("$_path/$id");
}