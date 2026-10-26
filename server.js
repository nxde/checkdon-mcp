import express from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import {
    McpServer,
    createMcpHandler
} from "@modelcontextprotocol/server";
import * as z from "zod/v4";

// Cổng chạy trên máy local hoặc do Northflank cung cấp
const PORT = Number(process.env.PORT) || 3000;

// Tạo MCP server và đăng ký công cụ thử nghiệm
const mcpHandler = createMcpHandler(() => {
    const server = new McpServer({
        name: "checkdon-mcp",
        version: "1.0.0"
    });

    // Công cụ này chỉ dùng để thử kết nối MCP
    server.registerTool(
        "hello_checkdon",
        {
            title: "Hello CheckDon",
            description:
                "Công cụ thử nghiệm kết nối MCP. " +
                "Nhận tên người dùng và trả về lời chào.",
            inputSchema: {
                name: z.string().min(1).describe(
                    "Tên người cần chào"
                )
            }
        },
        async ({ name }) => {
            console.log(
                `[MCP] hello_checkdon được gọi với name=${name}`
            );

            return {
                content: [
                    {
                        type: "text",
                        text: `Xin chào ${name}! MCP Check đơn hoạt động thành công.`
                    }
                ]
            };
        }
    );

    return server;
});

// Ở local, chỉ chấp nhận Host phù hợp với localhost.
// Khi triển khai, ALLOWED_HOSTS có thể cấu hình tên miền công khai.
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

// Endpoint kiểm tra trạng thái ứng dụng
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "checkdon-mcp"
    });
});

// Endpoint MCP dùng giao thức Streamable HTTP
const nodeHandler = toNodeHandler(mcpHandler);

app.all("/mcp", (req, res) => {
    void nodeHandler(req, res, req.body);
});

// Khởi động HTTP server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`CheckDon MCP đang chạy tại port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});