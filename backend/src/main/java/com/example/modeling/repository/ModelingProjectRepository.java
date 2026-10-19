package com.example.modeling.repository;

import com.example.modeling.domain.ModelingProject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ModelingProjectRepository extends JpaRepository<ModelingProject, UUID> {
}
