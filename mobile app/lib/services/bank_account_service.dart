import '../core/api.dart';

/// Dummy bank (simulated) customer accounts behind agency banking.
class BankAccountService {
  static const _path = "/bank-accounts";

  static List<Map<String, dynamic>> _list(dynamic data) =>
      data is List ? data.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList() : [];

  static Future<List<Map<String, dynamic>>> list() async => _list(await Api.get(_path));

  static Future<Map<String, dynamic>> lookup(String agentBankId, String accountNumber) async =>
      Map<String, dynamic>.from(
        await Api.get(
              "$_path/lookup?agent_bank_id=${Uri.encodeQueryComponent(agentBankId)}"
              "&account_number=${Uri.encodeQueryComponent(accountNumber)}",
            )
            as Map,
      );

  static Future<Map<String, dynamic>> statement(String id) async =>
      Map<String, dynamic>.from(await Api.get("$_path/$id/statement") as Map);

  static Future<List<Map<String, dynamic>>> messages(String accountId) async =>
      _list(await Api.get("$_path/messages?account_id=$accountId"));

  /// Sends a withdrawal OTP to the customer; returns { otp_id, expires_at, sent_to }.
  static Future<Map<String, dynamic>> sendOtp(String id, num amount) async =>
      Map<String, dynamic>.from(await Api.post("$_path/$id/otp", {"amount": amount}) as Map);

  /// Sends the balance to the customer by SMS and returns the account with its current balance.
  static Future<Map<String, dynamic>> balanceInquiry(String id) async =>
      Map<String, dynamic>.from(await Api.post("$_path/$id/balance-inquiry", {}) as Map);
}
