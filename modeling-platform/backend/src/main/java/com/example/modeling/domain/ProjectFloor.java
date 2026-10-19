package com.example.modeling.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.vladmihalcea.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "project_floors")
public class ProjectFloor {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private ModelingProject project;

    @Column(nullable = false)
    private String name;

    private Double height = 3.2;
    private String note;
    private Integer sortOrder = 0;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> plan;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public ModelingProject getProject() { return project; }
    public void setProject(ModelingProject project) { this.project = project; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public Map<String, Object> getPlan() { return plan; }
    public void setPlan(Map<String, Object> plan) { this.plan = plan; }
}
