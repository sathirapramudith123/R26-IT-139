import '../core/api.dart';

class CrudService {
  final String path;
  CrudService(this.path);

  Future<List<Map<String, dynamic>>> list() async {
    final data = await Api.get(path);
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  Future<Map<String, dynamic>> create(Map<String, dynamic> body) async =>
      (await Api.post(path, body)) as Map<String, dynamic>;

  Future<Map<String, dynamic>> update(String id, Map<String, dynamic> body) async =>
      (await Api.put("$path/$id", body)) as Map<String, dynamic>;

  Future<void> remove(String id) async => Api.delete("$path/$id");
}