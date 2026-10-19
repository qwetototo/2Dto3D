package com.example.modeling.service;

import com.example.modeling.domain.ModelingProject;
import com.example.modeling.domain.ProjectFloor;
import com.example.modeling.repository.ModelingProjectRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {
    private final ModelingProjectRepository repository;

    public ProjectService(ModelingProjectRepository repository) {
        this.repository = repository;
    }

    public List<ModelingProject> list() {
        return repository.findAll();
    }

    public ModelingProject get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Project not found"));
    }

    @Transactional
    public ModelingProject save(ModelingProject project) {
        project.getFloors().forEach(this::attachFloor);
        return repository.save(project);
    }

    @Transactional
    public ModelingProject update(UUID id, ModelingProject incoming) {
        ModelingProject project = get(id);
        project.setName(incoming.getName());
        project.setRegion(incoming.getRegion());
        project.setAddress(incoming.getAddress());
        project.setDescription(incoming.getDescription());
        project.setMetadata(incoming.getMetadata());
        project.getFloors().clear();
        incoming.getFloors().forEach(floor -> {
            floor.setProject(project);
            project.getFloors().add(floor);
        });
        return project;
    }

    public void delete(UUID id) {
        repository.deleteById(id);
    }

    private void attachFloor(ProjectFloor floor) {
        // project is assigned by controller/service before save when nested JSON is posted.
    }
}
