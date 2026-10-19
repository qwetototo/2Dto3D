package com.example.modeling.controller;

import com.example.modeling.domain.AssetModel;
import com.example.modeling.repository.AssetModelRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/assets")
@CrossOrigin
public class AssetController {
    private final AssetModelRepository repository;

    public AssetController(AssetModelRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<AssetModel> list() {
        return repository.findAll();
    }

    @PostMapping
    public AssetModel create(@RequestBody AssetModel asset) {
        return repository.save(asset);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        repository.deleteById(id);
    }
}
