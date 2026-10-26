import express from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import {
    McpServer,
    createMcpHandler
} from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const PORT = Number(process.env.PORT) || 3000;

// =========================
// 1. SCHEMA DỮ LIỆU ĐẦU VÀO
// =========================

const orderProductSchema = z.object({
    product_code: z.string(),
    qty: z.number(),
    unit_price: z.number().nullable().optional(),
    discount_rate: z.number().nullable().optional(),
    promotion_policy: z.string().nullable().optional()
});

const orderSchema = z.object({
    order_number: z.string(),
    customer_code: z.string(),
    products: z.array(orderProductSchema),
    discount_rate: z.number().nullable().optional(),
    promotion_policy: z.string().nullable().optional(),
    isPromoted: z.boolean().nullable().optional()
});

const invoiceProductSchema = z.object({
    line: z.number().nullable().optional(),
    product_code: z.string(),
    lot_number: z.string().nullable().optional(),
    expiry_date: z.string().nullable().optional(),
    qty: z.number(),
    unit_price: z.number(),
    amount: z.number(),
    discount_rate: z.number().nullable().optional(),
    discount_amount: z.number().nullable().optional(),
    net_amount: z.number()
});

const invoiceSchema = z.object({
    invoice_number: z.string(),
    customer_code: z.string(),
    products: z.array(invoiceProductSchema),
    discount_rate: z.number().nullable().optional(),
    discount_amount: z.number().nullable().optional(),
    net_amount: z.number()
});

// =========================
// 2. TẠO MCP HANDLER
// =========================

const mcpHandler = createMcpHandler(() => {
    const server = new McpServer({
        name: "checkdon-mcp",
        version: "1.0.0"
    });

    // Công cụ kiểm tra kết nối
    server.registerTool(
        "hello_checkdon",
        {
            title: "Hello CheckDon",
            description: "Kiểm tra kết nối MCP.",
            inputSchema: z.object({
                name: z.string().min(1)
            })
        },
        async ({ name }) => ({
            content: [
                {
                    type: "text",
                    text: `Xin chào ${name}! MCP Check đơn hoạt động thành công.`
                }
            ]
        })
    );

    // Công cụ nhận JSON đơn hàng và hóa đơn
    server.registerTool(
        "check_invoice",
        {
            title: "Check Invoice",
            description:
                "Nhận JSON đơn hàng và hóa đơn đã được GPT chuẩn hóa. " +
                "Phiên bản hiện tại chỉ trả kết quả minh họa, " +
                "chưa kiểm tra nghiệp vụ và chưa kết nối Google Sheets.",

            // API mới: bọc schema bằng z.object()
            inputSchema: z.object({
                order: orderSchema,
                invoice: invoiceSchema
            })
        },
        async ({ order, invoice }) => {
            console.log("\n========== CHECK INVOICE ==========");
            console.log("Order:", JSON.stringify(order, null, 2));
            console.log("Invoice:", JSON.stringify(invoice, null, 2));

            // Kết quả mẫu, chưa phải kết quả kiểm tra thực tế
            const output = {
                message_code: "DEMO_ONLY",
                message:
                    `Đã nhận đơn ${order.order_number} và ` +
                    `hóa đơn ${invoice.invoice_number}. ` +
                    "API hiện chỉ chạy chế độ demo, chưa kiểm tra " +
                    "giá, chiết khấu hoặc khuyến mãi. " +
                    "Các lỗi bên dưới chỉ là dữ liệu minh họa.",
                errors: [
                    {
                        error_code: "DEMO_PRICE_MISMATCH",
                        error_message:
                            "[DỮ LIỆU MẪU] Đơn giá trên hóa đơn " +
                            "có thể khác giá được phép áp dụng."
                    },
                    {
                        error_code: "DEMO_PROMOTION_MISMATCH",
                        error_message:
                            "[DỮ LIỆU MẪU] Khuyến mãi trên hóa đơn " +
                            "có thể chưa phù hợp với chính sách."
                    }
                ]
            };

            console.log("Output:", JSON.stringify(output, null, 2));

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(output, null, 2)
                    }
                ]
            };
        }
    );

    return server;
});

// =========================
// 3. HTTP SERVER
// =========================

const allowedHosts = process.env.ALLOWED_HOSTS
    ?.split(",")
    .map(host => host.trim())
    .filter(Boolean);

const app = allowedHosts?.length
    ? createMcpExpressApp({
        host: "0.0.0.0",
        allowedHosts
    })
    : createMcpExpressApp();

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "checkdon-mcp"
    });
});

const nodeHandler = toNodeHandler(mcpHandler);

app.all("/mcp", (req, res) => {
    void nodeHandler(req, res, req.body);
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`CheckDon MCP running on port ${PORT}`);
});