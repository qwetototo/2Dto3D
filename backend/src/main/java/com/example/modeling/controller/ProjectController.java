package com.example.modeling.controller;

import com.example.modeling.domain.ModelingProject;
import com.example.modeling.domain.ProjectFloor;
import com.example.modeling.service.ProjectService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/projects")
@CrossOrigin
public class ProjectController {
    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    @GetMapping
    public List<ModelingProject> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public ModelingProject get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    public ModelingProject create(@RequestBody ModelingProject project) {
        attach(project);
        return service.save(project);
    }

    @PutMapping("/{id}")
    public ModelingProject update(@PathVariable UUID id, @RequestBody ModelingProject project) {
        attach(project);
        return service.update(id, project);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    private void attach(ModelingProject project) {
        int index = 0;
        for (ProjectFloor floor : project.getFloors()) {
            floor.setProject(project);
            if (floor.getSortOrder() == null) floor.setSortOrder(index);
            index++;
        }
    }
}
