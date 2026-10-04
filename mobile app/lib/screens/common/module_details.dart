import 'package:flutter/material.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import '../procurement/procurement_details_screen.dart';
import '../suppliers/supplier_route_screen.dart';
import 'record_details.dart';

/// The details screen for one record of a module, or null to fall back to the plain dialog.
Widget? detailsScreenFor(String path, Map<String, dynamic> item) {
  switch (path) {
    case "/procurement":
      return ProcurementDetailsScreen(order: item);
    case "/transactions":
      return _transaction(item);
    case "/inventory":
      return _inventory(item);
    case "/suppliers":
      return _supplier(item);
    case "/agency-banking":
      return _agencyBanking(item);
  }
  return null;
}

List<Map> _list(dynamic v) => v is List ? v.whereType<Map>().toList() : <Map>[];

/* ------------------------------- Transaction ------------------------------- */

Widget _transaction(Map<String, dynamic> t) {
  final type = "${t["transaction_type"] ?? ""}".toLowerCase();
  final moneyIn = type == "sale" || type == "deposit";
  final items = _list(t["items"]);
  return RecordDetailsScreen(
    appBarTitle: tr("Transaction"),
    heading: words(type),
    figure: "${moneyIn ? "+" : "-"} ${money(t["amount"])}",
    figureCaption: moneyIn ? tr("Credit (money in)") : tr("Debit (money out)"),
    status: moneyIn ? (tr("Money in"), KadeColors.success) : (tr("Money out"), KadeColors.terra),
    facts: [
      (tr("Date"), dateOf(t["created_at"], time: true)),
      (tr("Payment"), words(t["payment_method"])),
      if (items.isNotEmpty) (tr("Items"), "${items.length}"),
    ],
    sections: [
      if (items.isNotEmpty)
        DetailCard(
          title: type == "purchase" ? tr("Items in this purchase") : tr("Items in this sale"),
          icon: Icons.shopping_basket_outlined,
          children: [
            for (final l in items)
              DetailLine(
                title: "${l["item_name"] ?? "—"}",
                detail: "${qtyOf(l["quantity"])} × ${money(l["unit_price"] ?? l["cost_price"])}",
                trailing: money(l["amount"] ?? numOf(l["quantity"]) * numOf(l["unit_price"])),
              ),
            const Divider(height: 20),
            DetailRow(tr("Total"), money(t["amount"])),
          ],
        ),
      if (hasText(t["category"]) || hasText(t["description"]))
        DetailCard(
          title: tr("Details"),
          icon: Icons.notes_outlined,
          children: [
            if (hasText(t["category"])) DetailRow(tr("Category"), tr("${t["category"]}")),
            if (hasText(t["description"])) DetailRow(tr("Description"), "${t["description"]}"),
          ],
        ),
    ],
  );
}

/* -------------------------------- Inventory -------------------------------- */

Widget _inventory(Map<String, dynamic> i) {
  final (statusLabel, statusColor) = switch ("${i["item_status"] ?? ""}".toUpperCase()) {
    "OUT_OF_STOCK" => (tr("Out of stock"), KadeColors.terra),
    "RUNNING_OUT" => (tr("Running out"), KadeColors.amber),
    _ => (tr("In stock"), KadeColors.success),
  };
  final unit = hasText(i["unit"]) && i["unit"] != "unit" ? " ${tr("${i["unit"]}")}" : "";
  final minCost = numOf(i["cost_min"]), maxCost = numOf(i["cost_max"]);
  return RecordDetailsScreen(
    appBarTitle: tr("Inventory Item"),
    heading: "${i["name"] ?? i["item_name"] ?? "—"}",
    subheading: hasText(i["category"]) ? tr("${i["category"]}") : null,
    figure: money(i["total_cost"]),
    figureCaption: tr("Total Stock Value"),
    status: (statusLabel, statusColor),
    facts: [
      (tr("Quantity"), "${qtyOf(i["quantity"])}$unit"),
      (tr("Reorder Level"), "${qtyOf(i["reorder_level"])}$unit"),
      if (i["batch_count"] != null) (tr("Batches"), "${i["batch_count"]}"),
    ],
    sections: [
      DetailCard(
        title: tr("Cost"),
        icon: Icons.payments_outlined,
        children: [
          DetailRow(tr("Avg. Unit Cost"), money(i["cost_price"])),
          if (maxCost > 0 && minCost != maxCost)
            DetailRow(tr("Cost Range"), "${money(minCost)} – ${money(maxCost)}"),
          DetailRow(tr("Total Stock Value"), money(i["total_cost"])),
        ],
      ),
      DetailCard(
        title: tr("Supplier"),
        icon: Icons.local_shipping_outlined,
        children: [
          DetailRow(tr("Supplier"), hasText(i["supplier_name"]) ? "${i["supplier_name"]}" : "—"),
          DetailRow(tr("Lead Time"), "${qtyOf(i["lead_time_days"] ?? 1)} ${tr("days")}"),
          if (hasText(i["received_at"])) DetailRow(tr("Last Received"), dateOf(i["received_at"])),
        ],
      ),
    ],
  );
}

/* -------------------------------- Supplier --------------------------------- */

Widget _supplier(Map<String, dynamic> s) {
  final items = _list(s["items_supplied"]);
  final hasPin = s["latitude"] != null && s["longitude"] != null;
  return RecordDetailsScreen(
    appBarTitle: tr("Supplier"),
    heading: "${s["name"] ?? s["supplier_name"] ?? "—"}",
    subheading: hasText(s["company_name"]) ? "${s["company_name"]}" : null,
    status: ("${items.length} ${tr("items")}", KadeColors.teal),
    facts: [
      (tr("Delivery Cost (LKR)"), money(s["delivery_cost"])),
      (tr("Lead Time"), "${qtyOf(s["lead_time_days"] ?? 1)} ${tr("days")}"),
    ],
    sections: [
      DetailCard(
        title: tr("Contact"),
        icon: Icons.contact_phone_outlined,
        children: [
          DetailRow(tr("Contact Number"), hasText(s["contact_number"]) ? "${s["contact_number"]}" : "—"),
          if (hasText(s["email"])) DetailRow(tr("Email"), "${s["email"]}"),
        ],
      ),
      if (items.isNotEmpty)
        DetailCard(
          title: tr("Items Supplied"),
          icon: Icons.inventory_2_outlined,
          children: [
            for (final it in items)
              DetailLine(
                title: "${it["item_name"] ?? "—"}",
                detail:
                    "${qtyOf(it["quantity"])}${hasText(it["unit"]) && it["unit"] != "unit" ? " ${tr("${it["unit"]}")}" : ""}",
                trailing: it["unit_price"] != null ? money(it["unit_price"]) : null,
              ),
          ],
        ),
      if (hasText(s["delivery_location"]) || hasPin)
        Builder(
          builder: (context) => DetailCard(
            title: tr("Location"),
            icon: Icons.place_outlined,
            children: [
              if (hasText(s["delivery_location"])) Text("${s["delivery_location"]}"),
              if (hasPin) ...[
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    icon: const Icon(Icons.directions_outlined),
                    label: Text(tr("How far? Show route")),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => SupplierRouteScreen(supplier: s)),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
    ],
  );
}

/* ------------------------------ Agency banking ----------------------------- */

Widget _agencyBanking(Map<String, dynamic> b) {
  final flagged = b["is_anomaly"] == true;
  final status = "${b["status"] ?? b["banking_status"] ?? ""}";
  return RecordDetailsScreen(
    appBarTitle: tr("Agency Banking"),
    heading: words(b["transaction_type"]),
    subheading: hasText(b["customer_name"]) ? "${b["customer_name"]}" : null,
    figure: money(b["amount"]),
    figureCaption: tr("Amount (LKR)"),
    status: flagged
        ? (tr("⚠ Looks unusual"), KadeColors.terra)
        : (hasText(status) ? words(status) : tr("✓ Normal"), KadeColors.success),
    facts: [
      (tr("Date"), dateOf(b["created_at"], time: true)),
      (tr("Service Fee"), money(b["service_fee"])),
      (tr("Commission"), money(b["commission"])),
    ],
    sections: [
      DetailCard(
        title: tr("Customer"),
        icon: Icons.person_outline,
        children: [
          DetailRow(tr("Customer Name"), hasText(b["customer_name"]) ? "${b["customer_name"]}" : "—"),
          if (hasText(b["customer_phone"])) DetailRow(tr("Customer Phone"), "${b["customer_phone"]}"),
          if (hasText(b["customer_nic"])) DetailRow(tr("Customer NIC"), "${b["customer_nic"]}"),
          if (hasText(b["account_number"])) DetailRow(tr("Account Number"), "${b["account_number"]}"),
          if (hasText(b["source_of_funds"])) DetailRow(tr("Source of Funds"), tr("${b["source_of_funds"]}")),
        ],
      ),
      DetailCard(
        title: tr("Account safety"),
        icon: Icons.shield_outlined,
        children: [
          DetailRow(
            tr("AI check"),
            flagged ? tr("⚠ Looks unusual") : tr("✓ Normal"),
            color: flagged ? KadeColors.terra : KadeColors.success,
          ),
          if (b["anomaly_score"] != null) DetailRow(tr("Risk score"), "${qtyOf(b["anomaly_score"])} / 100"),
          if (flagged)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                tr("This transaction looks different from your usual pattern — worth a quick check."),
                style: const TextStyle(color: KadeColors.terra, fontSize: 12),
              ),
            ),
        ],
      ),
    ],
  );
}
