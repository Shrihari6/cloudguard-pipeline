package com.cloudguard.backend.mcp;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation denoting an MCP (Model Context Protocol) tool method.
 * Compatible with Spring AI tool definitions and external LLM tool-calling interfaces.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface McpTool {
    String name() default "";
    String description() default "";
}
