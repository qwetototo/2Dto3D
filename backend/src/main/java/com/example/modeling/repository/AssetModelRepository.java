package com.example.modeling.repository;

import com.example.modeling.domain.AssetModel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AssetModelRepository extends JpaRepository<AssetModel, UUID> {
}
