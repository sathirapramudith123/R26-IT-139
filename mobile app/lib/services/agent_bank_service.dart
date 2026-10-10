import '../core/api.dart';

/// Agent float / settlement bank accounts (points 1,5,6,7).
class AgentBankService {
  static const _path = "/agent-banks";

  /// GET /agent-banks → { cash_pool: {...}, banks: [...] }.
  /// Cash on hand is one shared pool for all banks (not per bank).
  static Future<({Map<String, dynamic> pool, List<Map<String, dynamic>> banks})> fetch() async {
    final data = await Api.get(_path);
    if (data is List) return (pool: <String, dynamic>{}, banks: data.cast<Map<String, dynamic>>());
    if (data is! Map) return (pool: <String, dynamic>{}, banks: <Map<String, dynamic>>[]);
    final pool = data["cash_pool"] is Map ? Map<String, dynamic>.from(data["cash_pool"]) : <String, dynamic>{};
    final banks = (data["banks"] is List)
        ? (data["banks"] as List).whereType<Map>().map((b) => Map<String, dynamic>.from(b)).toList()
        : <Map<String, dynamic>>[];
    return (pool: pool, banks: banks);
  }

  /// Banks only. Each bank carries the shared pool's cash_on_hand so the transaction
  /// form can show "cash after" for the selected bank.
  static Future<List<Map<String, dynamic>>> list() async {
    final r = await fetch();
    final cash = r.pool["cash_on_hand"];
    return [
      for (final b in r.banks) {...b, "cash_on_hand": ?cash},
    ];
  }

  /// POST /agent-banks/pool/add-cash — put physical cash into the shared pool
  static Future<Map<String, dynamic>> addCash(num amount) async =>
      Map<String, dynamic>.from(await Api.post("$_path/pool/add-cash", {"amount": amount}) as Map);

  static Future<Map<String, dynamic>> create(Map<String, dynamic> body) async =>
      (await Api.post(_path, body)) as Map<String, dynamic>;

  static Future<Map<String, dynamic>> topup(String id, num amount) async =>
      (await Api.post("$_path/$id/topup", {"amount": amount})) as Map<String, dynamic>;

  static Future<Map<String, dynamic>> ledger(String id) async =>
      (await Api.get("$_path/$id/ledger")) as Map<String, dynamic>;

  static Future<void> remove(String id) async => Api.delete("$_path/$id");
}
