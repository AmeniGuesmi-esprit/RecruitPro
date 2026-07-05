package com.recruitment.application.dto;

import com.recruitment.application.model.ApplicationStatus;
import lombok.Data;

@Data
public class UpdateStatusRequest {
    private ApplicationStatus status;
}
