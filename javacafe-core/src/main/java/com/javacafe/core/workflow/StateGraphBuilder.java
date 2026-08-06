package com.javacafe.core.workflow;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * 轻量级、受 LangGraph 启发的状态图构建器。
 * 用于定义带条件分支的面试工作流状态机。
 *
 * <pre>
 * 在 DeepDiveWorkflow 中的使用示例：
 *
 *   StateGraphBuilder<String> builder = new StateGraphBuilder<>();
 *   builder.addNode("ask", this::askQuestion)
 *          .addNode("evaluate", this::evaluateAnswer)
 *          .addNode("summarize", this::summarizeTopic)
 *          .addEdge("ask", "evaluate")
 *          .addConditionalEdge("evaluate", ctx -> {
 *              if (ctx.depth >= 3) return "summarize";
 *              return "ask";
 *          })
 *          .addEdge("summarize", "end")
 *          .setEntryPoint("ask");
 * </pre>
 */
public class StateGraphBuilder<C> {

    private final Map<String, Function<C, C>> nodes = new HashMap<>();
    private final Map<String, String> edges = new HashMap<>();
    private final Map<String, Function<C, String>> conditionalEdges = new HashMap<>();
    private String entryPoint;

    public StateGraphBuilder<C> addNode(String name, Function<C, C> handler) {
        nodes.put(name, handler);
        return this;
    }

    public StateGraphBuilder<C> addEdge(String from, String to) {
        edges.put(from, to);
        return this;
    }

    public StateGraphBuilder<C> addConditionalEdge(String from, Function<C, String> router) {
        conditionalEdges.put(from, router);
        return this;
    }

    public StateGraphBuilder<C> setEntryPoint(String node) {
        this.entryPoint = node;
        return this;
    }

    public C execute(C initialState) {
        C ctx = initialState;
        String currentNode = entryPoint;

        while (currentNode != null && !"end".equals(currentNode)) {
            Function<C, C> handler = nodes.get(currentNode);
            if (handler == null) {
                throw new IllegalStateException("Unknown node: " + currentNode);
            }
            ctx = handler.apply(ctx);

            // 解析下一节点：条件边优先
            Function<C, String> conditional = conditionalEdges.get(currentNode);
            if (conditional != null) {
                currentNode = conditional.apply(ctx);
            } else {
                currentNode = edges.get(currentNode);
            }
        }
        return ctx;
    }
}
