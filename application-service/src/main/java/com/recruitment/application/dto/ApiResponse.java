package com.recruitment.application.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    /** Code d'erreur machine-readable (ex: "NO_SUBSCRIPTION", "QUOTA_EXCEEDED").
     *  Permet au front de distinguer les cas sans dépendre du code HTTP,
     *  qui peut être altéré par la Gateway. Null si success = true ou erreur générique. */
    private String code;

    public ApiResponse(boolean success, String message, T data) {
        this(success, message, data, null);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }

    public static <T> ApiResponse<T> error(String message, String code) {
        return new ApiResponse<>(false, message, null, code);
    }
}